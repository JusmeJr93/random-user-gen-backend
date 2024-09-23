import express from 'express';
import { faker, fakerEN_US, fakerPL, fakerES_MX, fakerEN_GB, fakerLV, fakerAR, fakerPT_PT, fakerKA_GE, fakerUZ_UZ_latin, fakerNE } from '@faker-js/faker';
import seedrandom from 'seedrandom';
import cors from 'cors';
import { Parser } from 'json2csv';

const app = express();
const PORT = 5000;

app.use(cors({
    // origin: ['http://localhost:5173', 'https://user-gen-pro.vercel.app'],
    origin: '*',
    methods: ['GET'],
    credentials: true
}));


const regionLocaleMap = {
    us: fakerEN_US,
    uk: fakerEN_GB,
    pl: fakerPL,
    lt: fakerLV,
    ae: fakerAR,
    mx: fakerES_MX,
    pt: fakerPT_PT,
    ge: fakerKA_GE,
    uz: fakerUZ_UZ_latin,
    bd: fakerNE
};


app.get('/generateData', (req, res) => {
    const { region, seed, pageNumber = 1, batchSize = 20, errors = 0 } = req.query;


    const fakerInstance = regionLocaleMap[region] || faker;


    const rng = seedrandom(`${seed}-${pageNumber}`);
    fakerInstance.seed(rng.int32());


    const data = generateFakeData(parseInt(batchSize), errors, fakerInstance, parseInt(pageNumber));
    res.json(data);
});


function generateFakeData(batchSize, errorRate, fakerInstance, pageNumber) {
    let records = [];
    const startIndex = (pageNumber - 1) * batchSize;

    for (let i = 0; i < batchSize; i++) {
        let record = {
            index: startIndex + i + 1,
            identifier: fakerInstance.string.uuid(),
            name: `${fakerInstance.person.firstName()} ${fakerInstance.person.middleName()} ${fakerInstance.person.lastName()}`,
            address: `${fakerInstance.location.city()}, ${fakerInstance.location.streetAddress()}, ${fakerInstance.location.zipCode()}`,
            phone: fakerInstance.phone.number()
        };


        record = applyErrors(record, errorRate);
        records.push(record);
    }
    return records;
}


function applyErrors(record, errorRate) {
    const errorTypes = ['delete', 'add', 'swap'];
    const fields = ['name', 'address', 'phone'];


    fields.forEach(field => {
        if (Math.random() < errorRate) {
            const errorType = errorTypes[Math.floor(Math.random() * errorTypes.length)];
            record[field] = introduceError(record[field], errorType);
        }
    });

    return record;
}


function introduceError(text, errorType) {
    if (text.length === 0) return text;

    const position = Math.floor(Math.random() * text.length);

    switch (errorType) {
        case 'delete':
            return text.slice(0, position) + text.slice(position + 1);
        case 'add':
            const randomChar = String.fromCharCode(97 + Math.floor(Math.random() * 26));
            return text.slice(0, position) + randomChar + text.slice(position);
        case 'swap':
            if (position < text.length - 1) {
                return (
                    text.slice(0, position) +
                    text[position + 1] +
                    text[position] +
                    text.slice(position + 2)
                );
            }
            return text;
        default:
            return text;
    }
}


app.get('/exportCSV', (req, res) => {
    const { region, seed, pageNumber = 1, batchSize = 20, errors = 0 } = req.query;

    const fakerInstance = regionLocaleMap[region] || faker;
    const rng = seedrandom(`${seed}-${pageNumber}`);
    fakerInstance.seed(rng.int32());

    // Generate the full data based on the pageNumber and batchSize
    const totalRecords = parseInt(pageNumber) * parseInt(batchSize);
    const data = generateFakeData(totalRecords, errors, fakerInstance, 1); // Start from page 1 to maintain consistency

    const json2csvParser = new Parser();
    const csv = json2csvParser.parse(data);

    res.header('Content-Type', 'text/csv');
    res.attachment('data.csv');
    res.send(csv);
});


app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: 'Internal Server Error' });
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
