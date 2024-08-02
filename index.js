import express from "express";
import auth from "./Routes/auth.js";
import {route,genRoomId} from "./Routes/play.js";
import cors from "cors";
import http from "http";
import {resolve} from "path";
import session from "express-session";
import redisClient from "./redismodel.js";
import RedisStore from "connect-redis";
import bodyParser from "body-parser";
import {Server} from "socket.io";
import conn from "./dbmodel.js";


const app = express()
const httpServer = http.createServer(app);
const iosocket = new Server(httpServer,{cors:{origin:"*"}});

app.use(cors({
    origin:"https://sock8-backend.onrender.com/",
    credentials:true
}));
app.use(bodyParser.urlencoded({extended:true}));
app.use(bodyParser.json());
app.use('/files',express.static(resolve()+'/userstorage'));
// app.use(multer.diskStorage({

// }));
app.use(session({
    store:(new RedisStore({client:redisClient})),
    secret:'whatever',
    resave:true,
    saveUninitialized:false,
    cookie:{
        secure:false,
        httpOnly:false,
        maxAge:24*60*60*1000
    }
}));
const bindConn = (req,res,next)=>{
    req.db_config = conn;
    next();
}

app.use("/auth", [bindConn,auth]);
app.use("/play", (req,res,next)=>{
    req.db_config = conn;
    req.iosocket_config = iosocket;
    next();
}
,route);

iosocket.of('/play').use(async (socket,next)=>{
    const sessId = socket.handshake.auth.sessionID;
    if(sessId){
        try{
            let session = await redisClient.hGetAll(sessId);
            if(session.publicID){
                socket.sessionID = sessId;
                socket.publicID = session.publicID;
                return next();
            }
        }
        catch(err){
            next(err);
        }
    }
    // Create newsession
    socket.sessionID = genRoomId(20);
    socket.publicID = genRoomId(20);
    await redisClient.hSet(socket.sessionID,{publicID:socket.publicID});
    next();
});
iosocket.of('/play').on('connection',(socket)=>{
    console.log('Instance connected');
    socket.join(socket.publicID);
    socket.emit("session",{
        sessionID:socket.sessionID,
        publicID:socket.publicID
    });
    socket.on('dsfs',()=>{
        console.log('Served');
    });
    socket.on('join',async (roomns)=>{
        socket.join(roomns);
        socket.roomns = roomns;
        console.log(200);
        //GOTTA CLEAN UP AND LEAVE ROOM AFTER GAME TERMINATES
    });
    socket.on('leave',async (det)=>{
        //GOTTA INFORM THE OTHERS THAT THIS DISCONNECTED USING PUBLIC ID
        socket.emit('left',true);
        delete socket['roomns'];
    });
    socket.on('move',async (nmove)=>{
        console.log(`Sent ${socket.roomns}`);
        socket.to(socket.roomns).emit('move',nmove);
        //GOTTA CLEAN UP AND LEAVE ROOM AFTER GAME TERMINATES
    });
    socket.on('MOVACK',async (tt)=>{
        console.log(`Recieved ${socket.roomns}`);
        socket.to(socket.roomns).emit('MOVACK',tt);
        //GOTTA CLEAN UP AND LEAVE ROOM AFTER GAME TERMINATES
    });
    socket.on('LOSS',async (nmove)=>{
        console.log(`Sent ${socket.roomns}`);
        socket.to(socket.roomns).emit('LOSS',nmove);
        //GOTTA CLEAN UP AND LEAVE ROOM AFTER GAME TERMINATES
    });
    socket.on('LOSSACK',async (tt)=>{
        console.log(`Recieved ${socket.roomns}`);
        socket.to(socket.roomns).emit('LOSSACK',tt);
        //GOTTA CLEAN UP AND LEAVE ROOM AFTER GAME TERMINATES
    });
    socket.on('DRAW',async (nmove)=>{
        console.log(`Sent ${socket.roomns}`);
        socket.to(socket.roomns).emit('DRAW',nmove);
        //GOTTA CLEAN UP AND LEAVE ROOM AFTER GAME TERMINATES
    });
    socket.on('DRAWACK',async (tt)=>{
        console.log(`Recieved ${socket.roomns}`);
        socket.to(socket.roomns).emit('DRAWACK',tt);
        //GOTTA CLEAN UP AND LEAVE ROOM AFTER GAME TERMINATES
    });
    socket.on('save',async (game)=>{
        //Modify this to pull creds for req.session variables
        let users = await conn.db('sock8').collection("users");
        let cuser = await users.findOne({uname:game.user.uname});
        if(cuser){
            try{users.updateOne({'uname':game.user.uname},{
                $push:{"history.tictactoe":{
                    opponent:game.opponent,
                    result:game.result,
                    moves:game.moves
                }}
            }
        );

        }
            catch(e){
                console.log(e.stack);
            }
        }
        console.log(cuser);
    });
    socket.on("disconnect",async ()=>{
        const matchSockets = await iosocket.in(socket.userID).fetchSockets();
        const isDisconnected = matchSockets.size===0;
        if(isDisconnected){
            socket.broadcast.emit("user disconnected",socket.userID);
            //Cleanup code here
        }
        let res = await redisClient.hDel(socket.sessId);
        console.log(`Deleted session ===>${res}`)
    })
});

httpServer.listen(5000, () => {
    console.log("listening at http://localhost:5000");
})
