import dotenv from 'dotenv';
import AlphaVantage from 'alphavantage-ts';
import symbols from './symbols';
import fs from 'fs/promises';
import path from 'path';
import axios from 'axios';
import { AsyncScheduler } from './scheduler';

dotenv.config();

if (!process.env.ALPHA_VANTAGE_API_KEY) {
    console.error('Please set ALPHA_VANTAGE_API_KEY env variable.');
    process.exit(1);
}

const ALPHA_KEY = process.env.ALPHA_VANTAGE_API_KEY;
const alpha = new AlphaVantage(ALPHA_KEY);

(async () => {
    const alphaScheduler = new AsyncScheduler(12000);
    const promises = symbols.map(async (symbol) => {

        const overviewData = await alphaScheduler.queue(() => {
            console.log(`querying ${symbol} OVERVIEW`);

            // OVERVIEW is somehow not in api :(.
            // alpha.api.request is also not suitable for querying OVERVIEW cause unusual response format.
            const url = `https://www.alphavantage.co/query?function=OVERVIEW&symbol=${symbol}&apikey=${ALPHA_KEY}`;
            return axios.get(url);
        });

        const {MarketCapitalization: marketCap, Name: name} = overviewData.data;

        const rsiData = await alphaScheduler.queue(
            () => {
                console.log(`querying ${symbol} RSI`);
                return alpha.technicals.rsi(
                    symbol,
                    {
                        interval: '30min',
                        series_type: 'open',
                        time_period: 10
                    }
                )
            }
        );

        const rsiTitle = rsiData['Meta Data']['2: Indicator'];
        const rsiVal = Object.entries(rsiData['Technical Analysis: RSI'])[0][1];

        return {
            symbol,
            name,
            params: [
                {
                    id: 'marketCap',
                    title: 'Капитализация',
                    value: marketCap,
                },
                {
                    id: 'rsi',
                    title: rsiTitle,
                    value: rsiVal,
                }
            ],
        };
    });

    alphaScheduler.start();

    const data = await Promise.all(promises)
        .catch((e) => {
            console.error('Error while data loading:')
            console.error(e);
            process.exit(1);
        });

    console.log('writing output');
    await fs.writeFile(
        path.resolve(process.cwd(), './output.json'),
        JSON.stringify(data, null, 4),
        'utf-8'
    );
})();
