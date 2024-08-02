import { MongoClient, ServerApiVersion } from "mongodb";
import { config } from "dotenv";
config();

const client = new MongoClient(process.env.PDB, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: false,
        deprecationError: true
    }
});
// async function run() {
//     // await client.connect();
//     // await client.db("sock8").command({ ping: 1 });
//     console.log('Connected');
//     return new Promise((resolve, reject) => { resolve(client) });
// }
// let conn;
// try {
//     conn = await run();
// }
// catch (err) {
//     console.log(err.stack);
// }


export default client;