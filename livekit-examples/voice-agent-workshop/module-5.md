# Add funcion tools

In this exercise, we'll add function tools to the agent.

Step 1: Add the import to the `agent.py` file:

    ```python
    from livekit.agents.llm import function_tool
    from livekit.agents import RunContext
    import aiohttp
    ```

Step 2: Add a simple function tool to the `Assistant` class:

    ```python
    @function_tool
    async def lookup_weather(self, context: RunContext, location: str):
        """Use this tool to look up current weather information in the given location.

        If the location is not supported by the weather service, the tool will indicate this. You must tell the user the location's weather is unavailable.

        Args:
            location: The location to look up weather information for (e.g. city name)
        """

        logger.info(f"Looking up weather for {location}")

        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(f"http://shayne.app/weather?location={location}") as response:
                    if response.status == 200:
                        data = await response.json()
                        condition = data.get("condition", "unknown")
                        temperature = data.get("temperature", "unknown")
                        unit = data.get("unit", "degrees")
                        return f"{condition} with a temperature of {temperature} {unit}"
                    else:
                        logger.error(f"Weather API returned status {response.status}")
                        return "Weather information is currently unavailable for this location."
        except Exception as e:
            logger.error(f"Error fetching weather: {e}")
            return "Weather service is temporarily unavailable."
    ```

# Add MCP servers

In this exercise, we'll add an MCP server to the agent.

Step 1: Install the MCP package

    ```shell
    uv add "livekit-agents[mcp]"
    ```

Step 2: Add the import to the `agent.py` file:

    ```python
    from livekit.agents import mcp
    ```
    
Step 3: Add the MCP servers to the `Assistant` class's super constructor:

    ```python
    mcp_servers=[
        mcp.MCPServerHTTP(url="https://shayne.app/sse"),
    ],
    ```

Your agent now has a simple MCP server that supports a tool called `add_numbers`.