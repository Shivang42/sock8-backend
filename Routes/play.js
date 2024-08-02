import express from "express"
import readline from 'node:readline';
import { ObjectId } from "mongodb";
import { config } from 'dotenv';
import crypto from 'crypto';

let genRoomId = (len) => {
    return crypto.randomBytes(len).toString('hex');
};
const reader = readline.createInterface(process.stdin, process.stdout);
import { MongoClient, ServerApiVersion } from "mongodb";
// const mongocloud = "mongodb+srv://shivang4110:Shivang4110@cluster0.eb2igke.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

config();

const route = express.Router();

route.get("/", async (req, res, next) => {
    console.log(100);
    try {
        const conn = req.db_config;
        const db = conn.db("sock8");
        const users = db.collection("users");

        let kets = await users.find({});
        for await (let doc of kets) {
            console.log(doc);
        }
        conn.close();
    }
    catch (err) {
        console.log(err.stack);
    }
});
route.post("/getroom", async (req, res, next) => {
    console.log(100);
    console.log(req.body);
    if (!req.body.data.uname || !req.body.data.game) {
        res.send({
            type: 'error',
            msg: 'Missing Credentials (to create room)'
        });
    }
    else {
        let body = {
            type: 'success',
            msg: 'Request pending'
        };
        const conn = req.db_config;
        try {
            const db = conn.db("sock8");
            const rooms = db.collection("rooms");
            const roomReqs = db.collection("roomrequests");

            let reqSet = await roomReqs.find({
                game: req.body.data.game,
                origin:{
                    $not:{$eq:req.body.data.uname}
                }
            }).sort({ created: 1 });
            let count = await reqSet.count();
            console.log(`Request count: ${count}`);
            if (await count != 0) {
                let passReq = await reqSet.toArray();
                //Have to check if request set is empty !!!!!!!!!!!!!!
                passReq = passReq[0];
                let rid = genRoomId(25);
                // 2 player only currently
                let isCapped = await rooms.aggregate([{$collStats:{storageStats:{}}}]);
                isCapped = await isCapped.toArray();
                isCapped = isCapped[0];
                if (await isCapped.storageStats.size==isCapped.storageStats.maxSize) {
                    Object.assign(body, { type: 'error', msg: 'Reload page, capped rooms' })
                }
                else {
                    let newRoom  = {
                        namespace: rid,
                        origin: passReq.origin,
                        players: [{uname:passReq.origin,sid:passReq.pl1id,details:{}}, {uname:req.body.data.uname,sid:req.body.data.sid,details:{}}],
                        game: req.body.data.game,
                        created: (new Date())
                    };
                    // Make this dependent on some meta-data config file(game catalog independent)
                    switch(newRoom.game){
                        case "tictactoe":
                            let marks = ["x","o"].sort((a,b)=>((Math.random()>0.5)?(a-b):(b-a)));
                            let cols = ["#ff2400","#603fef"].sort((a,b)=>((Math.random()>0.5)?(a-b):(b-a)));
                            newRoom.players.forEach((ply,i)=>{
                                Object.assign(newRoom.players[i].details,{mark:marks[i],color:cols[i]});
                            });
                            break;
                    }
                    let inserted = await rooms.insertOne(newRoom);
                    if(!inserted.acknowledged){
                        Object.assign(body, { type: 'error', msg: 'Reload page' });
                    }
                    else{
                        let doc = await rooms.findOne({_id:(new ObjectId(inserted.insertedId.toString()))});
                        let matchreq = await roomReqs.findOneAndDelete({_id:(new ObjectId(passReq._id.toString()))});

                        console.log("Connected to scoket");
                        doc.players.forEach(player=>{
                            console.log(player.sid);
                            req.iosocket_config.of('/play').to(player.sid).emit("Request processed",{
                                status:"matched",namespace:doc.namespace,
                                details:player.details
                            });
                        });

                        Object.assign(body, {
                            msg: 'Room joined',
                            namespace: rid,
                            details:newRoom.players[1].details
                        });

                    }
                }
            }
            else {
                await roomReqs.insertOne({
                    origin: req.body.data.uname,
                    pl1id:req.body.data.sid,
                    game: req.body.data.game,
                    created: (new Date())
                });
            }


            res.send(body);
        }
        catch (err) {
            console.log(100);
            console.log(err.stack);
        }
        finally {
            // await conn.close();
        }
    }
    return;

});


export {route,genRoomId};
// let user = { uname: 2, uname: "SShukla", passwd: "what", history: { tictactoe: [{ opponent: "someone", result: "win", moves: [0, 3, 1, 4, 2] }] } };
//         await new Promise(resolve => {
//             reader.question("What is your id? ", (id)=>{
//                 user.uname = parseInt(id);
//                 resolve();
//             })
//         })
