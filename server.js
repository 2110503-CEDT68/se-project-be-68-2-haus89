const express = require("express");
const dotenv = require("dotenv");
const cookieParser = require("cookie-parser");
const connectDB = require("./config/db");
const expressMongoSanitize = require("@exortek/express-mongo-sanitize");
const helmet = require("helmet");
const { xss } = require("express-xss-sanitizer");
const rateLimit = require("express-rate-limit");
const hpp = require("hpp");
const cors = require("cors");
const morgan = require("morgan");
const swaggerJsDoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");

//Load env vars
dotenv.config({ path: "./config/config.env" });

//Connect to database
connectDB();

//Route files
const dentists = require("./routes/dentists");
const auth = require("./routes/auth");
const bookings = require("./routes/bookings");
const users = require("./routes/users");
const app = express();
const records = require("./routes/records");

//Swagger options
const swaggerOptions = {
  swaggerDefinition: {
    openapi: "3.0.0",
    info: {
      title: "Library API",
      version: "1.0.0",
      description:
        "API for managing dentist appointments, schedules, and user bookings",
    },
    servers: [
      {
        url: "http://localhost:5003/api/v1",
      },
    ],
  },
  apis: ["./routes/*.js"],
};

const swaggerDocs = swaggerJsDoc(swaggerOptions);
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocs));

//Enable CORS
app.use(cors());

//Request logging
app.use(morgan("dev"));

//Body parser
app.use(express.json());

//Cookie parser
app.use(cookieParser());

//Sanitize data
app.use(expressMongoSanitize());

//Set security headers
app.use(helmet());

//Prevent XSS attacks
app.use(xss());

//Rate limiting --------------------------------------------------------

// const limiter = rateLimit({
//   windowMs: 10 * 60 * 1000, //10 mins
//   max: 100,
// });
// app.use(limiter);

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  handler: (req, res) => {
    res.status(429).json({ success: false, message: "Too Many Requests" });
  },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  handler: (req, res) => {
    res.status(429).json({ success: false, message: "Too Many Auth Requests" });
  },
});

//app.use(generalLimiter);
//app.use("/api/v1/auth", authLimiter);

//---------------------------------------------------------

//Prevent http param pollution
app.use(hpp());

app.use("/api/v1/dentists", dentists);
app.use("/api/v1/auth", auth);
app.use("/api/v1/bookings", bookings);
app.use("/api/v1/users", users);
app.use("/api/v1/records", records);
app.set("query parser", "extended");

const PORT = process.env.PORT || 5003;

const server = app.listen(PORT, () => {
  console.log(
    "Server running in ",
    process.env.NODE_ENV,
    " mode on port ",
    PORT,
  );
});

//Handle unhandled promise rejections
process.on("unhandledRejection", (err, promise) => {
  console.log(`Error: ${err.message}`);
  //Close server & exit process
  server.close(() => process.exit(1));
});
