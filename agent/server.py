"""
Gemini A2A Agent Server
Run this to start the A2A agent server that can be connected to from the UI.
"""

import os
import click
import uvicorn

from agent import get_agent_card
from agent_executor import GeminiAgentExecutor
from a2a.server.request_handlers import DefaultRequestHandler
from a2a.server.tasks import InMemoryTaskStore
from a2a.server.apps import A2AStarletteApplication


@click.command()
@click.option("--host", default="0.0.0.0", help="Host to bind to")
@click.option("--port", default=41241, help="Port to bind to")
@click.option("--model", default="gemini-2.0-flash", help="Gemini model name")
def main(host: str, port: int, model: str):
    """Start the Gemini A2A Agent server."""
    
    # Check for API key
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        click.echo("ERROR: GEMINI_API_KEY environment variable not set!")
        click.echo("Please set your Gemini API key:")
        click.echo("  Windows: set GEMINI_API_KEY=your_api_key")
        click.echo("  Linux/Mac: export GEMINI_API_KEY=your_api_key")
        click.echo("\nGet your API key from: https://aistudio.google.com/app/apikey")
        return

    click.echo(f"Starting Gemini A2A Agent Server...")
    click.echo(f"  Model: {model}")
    click.echo(f"  Server: http://{host}:{port}")
    click.echo(f"  Agent Card: http://{host}:{port}/.well-known/agent.json")

    # Create agent executor
    agent_executor = GeminiAgentExecutor(model_name=model)

    # Create task store (in-memory)
    task_store = InMemoryTaskStore()

    # Create request handler
    request_handler = DefaultRequestHandler(
        agent_executor=agent_executor,
        task_store=task_store,
    )

    # Get agent card
    agent_card = get_agent_card()

    # Create A2A application
    a2a_app = A2AStarletteApplication(
        agent_card=agent_card,
        http_handler=request_handler,
    )

    # Run server
    click.echo("\nServer is ready! You can now connect from the A2A UI.")
    click.echo("Press Ctrl+C to stop the server.")
    
    uvicorn.run(
        a2a_app.build(),
        host=host,
        port=port,
        log_level="info",
    )


if __name__ == "__main__":
    main()
