import OpenAI from "openai"
import { ENV } from "../config/env"

const client=new OpenAI({apiKey:ENV.openai})

export async function plan(goal:string){

 const res=await client.chat.completions.create({

  model:"gpt-5-mini",

  messages:[
   {role:"system",content:"Convert goal into steps"},
   {role:"user",content:goal}
  ]

 })

 return res.choices[0].message.content!

}