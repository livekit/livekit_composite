# How to Get Help from LiveKit with Agents

Use our Community Slack channels to get your answers. If you are not a a member of the LiveKit Community Slack group, please join by going to [https://livekit. io/join-slack](https://livekit. io/join-slack) or click the link to join on the bottom of the [LiveKit](https://livekit. io/) page.


> **Note:** **Tip**: When signing up to join the LiveKit Community Slack, please use the same email address that you use for your LiveKit Cloud account. This helps find your account quickly.

Before asking your question take a moment to read through this guide [Slack Etiquette](https://kb. livekit. io/articles/6742638954-slack-etiquette).


## Common Questions Relating to Agents

Best place to get quick answers are the LiveKit [docs](https://docs. livekit. io/home/) we will add more FAQs regularly [here](https://kb. livekit. io/) as we notice things that are possibly confusing and may have not made it into the docs yet.

Here are some common questions and their answers:


### Q: I want to migrate from Agents 0.x to 1.x where do I start


- This [migration Guide](https://docs. livekit. io/agents/v1/start/v0-migration/) can get you started
- The [Agents 1.0 docs](https://docs. livekit. io/agents/v1/) are a must read for building good reliable Agents
- We have many code [examples](https://github. com/livekit/agents/tree/main/examples) that demonstrate the most common use cases.


### Q: Why do I see high latency For My Agents


- This [article](https://kb. livekit. io/articles/4490830410-how-can-i-reduce-latency-in-voice-pipeline-agents-using-stt-tts-and-llm) helps in 99% high latency of cases


### Q: How do I deploy my agent on a LiveKit hosted server


- Currently users need to host their own Agent servers
- We hope to have more news about LiveKit Agent hosting later this year


### Q: The agent is pronouncing something wrong like $1,000


- You can programmatically adjust pronunciation
- Check with your TTS provider and their abilities. Some are tuned for speed others are tuned for accuracy, and others are tuned for domain specific language like medical or legal use. This [guide](https://elevenlabs. io/docs/best-practices/prompting/normalization#use-clear-and-explicit-prompts) from ElevenLabs has some great guidance. Check with the specific provider you are using for their specifics.


### Q: I am confused about pricing for xyz


- Best place to look is our [pricing page](https://livekit. io/pricing)
- If you still have questions this [article](https://kb. livekit. io/articles/3947254704-understanding-livekit-cloud-pricing) can help


### Q: Which LLM, STT, TTS is best


- This greatly depends on your use case and what criteria you consider as "Best". The field is evolving rapidly. There are resources on the web dedicated to benchmarking these things and we would urge you to search those out to make an informed decision


### Q: I am seeing agents not answering a call or dispatch


> **Note:** Example message that you see intermittently:*The room connection was not established within 10 seconds after calling job_entry...*


- If you need high reliability make sure you are running multiple servers for each `agent_name`
- Make sure you are not running other application on the server with your agent
- Follow this guidance for [Deploying Agents To Production](https://docs. livekit. io/agents/v1/ops/deployment/). Pay close attention to: Load BalancingAuto ScalingWorker Availability


### Q: Should I use Python or JS for my agent development


> **Note:** Agent-JS is currently a beta solutionWork has been started to bring `agent-js` up to the same level as Agents 1.0 with many more plugins, retry logic, fallback logic etc but there is still a lot of work to be done before it is ready.


- If you are currently planning to produce a production grade agent we recommend you use Python.


## Still Have Question? Seehere