const express = require('express');
const dotenv = require('dotenv');

//Load env vars
dotenv.config({path: './config/config.env'});

const app = express();

app.get('/', (req, res) => {
  res.status(200).json({success:true, data:{id:1}});
});

const PORT = process.env.PORT || 5003;
app.listen(PORT, console.log('Server running'));