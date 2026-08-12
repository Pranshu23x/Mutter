import dotenv from "dotenv";
dotenv.config();
import arcjet, { shield, slidingWindow } from "@arcjet/node";
const aj = arcjet({
  key: process.env.ARCJET_KEY,
  env: process.env.ARCJET_ENV,
  rules:[
    shield({mode: "DRY_RUN"})
  ],
});

const freePlan= aj.withRule(
    slidingWindow({
        mode: "DRY_RUN",
        characteristics:["userId"],
        interval:60,
        max:5,
    })
)

const proPlan= aj.withRule(
    slidingWindow({
        mode: "DRY_RUN",
        characteristics:["userId"],
        interval:60,
        max:30,
    })
)

export { freePlan, proPlan };
export default aj;