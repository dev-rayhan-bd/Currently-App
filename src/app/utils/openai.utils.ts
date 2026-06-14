import axios from 'axios';
import config from '../config';

export const generateRipplesWithAI = async (title: string, subject: string, dueDate: Date, count?: number) => {
  const apiKey = config.openai_api_key;
  
  const prompt = `You are a professional study planner. 
  Task: "${title}" for Subject: "${subject}". 
  Deadline: ${dueDate.toISOString()}.
  Break this task into ${count || 'a logical number of'} study sessions (Ripples).
  
  For each session, provide:
  1. "title": actionable short name.
  2. "duration": 25, 45, or 60 minutes.
  3. "date": suggested date (YYYY-MM-DD) before the deadline.

  Return ONLY a valid JSON object: {"ripples": [{"title": "...", "duration": 45, "date": "2026-04-10"}]}`;

  const response = await axios.post(
    'https://api.openai.com/v1/chat/completions',
    {
      model: "gpt-4o-mini", 
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.7,
    },
    { headers: { 'Authorization': `Bearer ${apiKey}` } }
  );

  return JSON.parse(response.data.choices[0].message.content).ripples;
};