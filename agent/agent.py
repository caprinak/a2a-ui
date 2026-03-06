"""
Gemini A2A Agent - Agent Card and Skills Definition
"""

from a2a.types import AgentCard, AgentCapabilities, AgentSkill


def get_agent_card() -> AgentCard:
    """Define the agent card with metadata and capabilities."""
    return AgentCard(
        name="Gemini AI Assistant",
        description="An AI assistant powered by Google Gemini API. Can answer questions, "
                   "provide explanations, help with coding, and more.",
        url="http://localhost:41241",
        version="1.0.0",
        documentationUrl="https://ai.google.dev/docs",
        capabilities=AgentCapabilities(
            streaming=True,
            pushNotifications=False,
            stateTransitionHistory=True,
        ),
        defaultInputModes=["text"],
        defaultOutputModes=["text"],
        skills=[
            AgentSkill(
                id="general-assistant",
                name="General Assistant",
                description="General purpose AI assistant that can help with various tasks "
                           "including问答, coding, writing, and analysis.",
                examples=[
                    "What is machine learning?",
                    "Write a Python function to calculate factorial",
                    "Explain quantum computing in simple terms",
                ],
                inputModes=["text"],
                outputModes=["text"],
            ),
        ],
    )
