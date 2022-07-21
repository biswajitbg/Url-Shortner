const shortId = require("shortid");
const validUrl = require("valid-url");
const urlModel = require("../Models/urlModel");
const {isValid} = require('../validation/validation.js');
const redis = require('redis');
const {promisify} = require('util');

const redisClient = redis.createClient(
  14513,
  "redis-14513.c264.ap-south-1-1.ec2.cloud.redislabs.com",
  { no_ready_check: true }
);
redisClient.auth("Lio9hkOPUbqWD6XintERZYTLHNSWl9xv", function (err) {
  if (err) throw err;
});

redisClient.on("connect", async function () {
  console.log("Connected to Redis..");
});

const SET_ASYNC = promisify(redisClient.SET).bind(redisClient);
const GET_ASYNC = promisify(redisClient.GET).bind(redisClient);

const urlValidaton =/^(https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|www\.[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9]+\.[^\s]{2,}|www\.[a-zA-Z0-9]+\.[^\s]{2,})?$/

const shorternUrl = async function(req, res){
        try {
          let { longUrl } = req.body

          
          if(!isValid(longUrl))return res.status(400).send({status:false, message:"Please give the longUrl in the Body"})

          if(!urlValidaton.test(longUrl)) return res.status(400).send({status:false, message:"Please give valid Url "})

        const caching = await GET_ASYNC(`${longUrl}`);  //e.g => return  "" /null

        if(caching){
          let  data = JSON.parse(caching);
          console.log("from post caching ");     
          return res.status(200).send({ msg:"succesfull",data})
        }else{
          console.log("from post DB ");

          const urlCode = shortId.generate().toLocaleLowerCase();
          const shortUrl = `http://localhost:3000/${urlCode}`  //e.g => http://localhost:3000/dosfiwo;


          req.body.urlCode =urlCode 
          req.body.shortUrl =shortUrl
          
          await SET_ASYNC(`${longUrl}`, JSON.stringify(req.body));
          const saveData = await urlModel.create(req.body);
          return  res.status(201).send({ msg:"succesfull",data:{longUrl:saveData.longUrl,shortUrl:saveData.shortUrl,urlCode:saveData.urlCode}})
        }

     
}
catch(err){return  res.status(500).send({status:false,message:err.message})}}

const getUrl = async function(req, res){
try {
    const urlCode = req.params.urlCode;
    const isData =await urlModel.findOne({urlCode});
    if(!isData) return  res.status(404).send({status:false,message:"url not found"});

      const caching = await GET_ASYNC(`${req.params.urlCode}`);
      if(caching){
        console.log("present in caching")
        return res.status(302).redirect(JSON.parse(caching));
      }else{

        const isData =await urlModel.findOne({urlCode});
        if(!isData) return  res.status(404).send({status:false,message:"this urlCode is not present in our database"});
      
        await SET_ASYNC(`${req.params.urlCode}`, JSON.stringify(isData.longUrl));
      
        return res.status(302).redirect(isData.longUrl)
      }


}
catch(err){return  res.status(500).send({status:false,message:err.message})
}}

module.exports = { shorternUrl ,getUrl}