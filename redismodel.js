import {createClient} from "redis";
import { config } from "dotenv";
config();
const redisClient = createClient({
    url:process.env.REDIS_URL
	
});
redisClient.on("error",(err)=>{
    if(err){console.error(err);}
    else{console.log("redis error ...")}
})
redisClient.on("connect",(err)=>{
    if(err){console.error(err);}
    else{console.log("redis connected ...")}
})
redisClient.connect().catch(console.error);

export default redisClient;
