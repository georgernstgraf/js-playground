const { faker } = require('@faker-js/faker');
const { createId } = require('@paralleldrive/cuid2');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const recordsPerSec = 100;
const secTarget = 30;
const parallel = 2000;
const many = recordsPerSec * secTarget;
let failures = 0;
function insertPromise(key) {
    return new Promise((resolve, reject) => {
        prisma.user
            .create({
                data: {
                    email: Array.from(faker.internet.email())
                        .map((e) => (Math.random() > 0.8 ? e.toUpperCase() : e))
                        .join(''),
                    fullname: faker.person.fullName()
                }
            })
            .then(() => resolve(key))
            .catch((e) => {
                if (!e.name == 'PrismaClientKnownRequestError') {
                    console.dir(e);
                    console.log('CATCH');
                }
                failures++;
                resolve(key);
            });
    });
}
async function main() {
    const start = new Date();
    const bucket = {};
    while (Object.keys(bucket).length < parallel) {
        const id = createId();
        bucket[id] = insertPromise(id);
    }
    console.log('Bucket voll');
    manyLoops = many - parallel;
    for (let i = 0; i < manyLoops; i++) {
        const doneId = await Promise.any(Object.values(bucket));
        delete bucket[doneId];
        const id = createId();
        bucket[id] = insertPromise(id);
    }
    console.log('Schleife durch');
    while (Object.keys(bucket).length > 0) {
        const doneId = await Promise.any(Object.values(bucket));
        delete bucket[doneId];
    }
    console.log('bucket leer');
    const end = new Date();
    const secondsItTook = Math.round((end - start) / 1000);
    const performance = Math.round(many / ((end - start) / 1000));
    console.log(
        `seeding took ${secondsItTook} seconds for ${many} records (${performance} recs/sec with ${failures} duplicates)`
    );
}

main()
    .catch((e) => {
        console.error('ERR');
        console.error(e.message);
    })
    .finally(() => {
        console.log('finally');
        prisma.$disconnect();
    });
