import {createClient} from "redis";
const redisClient = createClient({
    url:'redis://:qXp94UMMpGqRULpWeBuXbVfTO2e9Y1rO@redis-14365.c1.asia-northeast1-1.gce.redns.redis-cloud.com:14365/12439507'
	
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