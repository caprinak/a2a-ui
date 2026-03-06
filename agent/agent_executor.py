"""
Gemini A2A Agent - Agent Executor
Handles task execution using Google Gemini API
"""

import os
import json
import asyncio
from typing import Optional, AsyncIterable
from datetime import datetime

import google.generativeai as genai
from google.generativeai import GenerativeModel
from google.generativeai.types import HarmCategory, HarmBlockThreshold

from a2a.server.agent_execution import AgentExecutor, TaskOutput
from a2a.server.tasks import TaskMemento
from a2a.types import (
    Task,
    TaskStatus,
    TaskState,
    Message,
    Part,
    TextPart,
    Artifact,
)


class GeminiAgentExecutor(AgentExecutor):
    """Agent executor that uses Google Gemini API for processing requests."""

    def __init__(self, model_name: str = "gemini-2.0-flash"):
        self.model_name = model_name
        self.conversation_history: dict[str, list[dict]] = {}
        
        # Configure Gemini
        api_key = os.environ.get("GEMINI_API_KEY")
        if not api_key:
            raise ValueError("GEMINI_API_KEY environment variable not set")
        
        genai.configure(api_key=api_key)
        
        # Set safety settings for Gemini
        self.safety_settings = {
            HarmCategory.HARM_CATEGORY_HARASSMENT: HarmBlockThreshold.BLOCK_NONE,
            HarmCategory.HARM_CATEGORY_HATE_SPEECH: HarmBlockThreshold.BLOCK_NONE,
            HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT: HarmBlockThreshold.BLOCK_NONE,
            HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT: HarmBlockThreshold.BLOCK_NONE,
        }
        
        self.generation_config = {
            "temperature": 0.9,
            "top_p": 0.95,
            "top_k": 40,
            "max_output_tokens": 8192,
        }

    def _extract_text_from_parts(self, parts: list[Part]) -> str:
        """Extract text content from message parts."""
        texts = []
        for part in parts:
            if isinstance(part, dict) and part.get("kind") == "text":
                texts.append(part.get("text", ""))
            elif hasattr(part, "text"):
                texts.append(part.text)
        return "\n".join(texts)

    def _create_text_artifact(self, text: str, artifact_id: str = "default") -> Artifact:
        """Create a text artifact from the response."""
        return Artifact(
            artifactId=artifact_id,
            parts=[
                TextPart(
                    kind="text",
                    text=text,
                )
            ],
        )

    async def execute(
        self,
        task_memento: TaskMemento,
    ) -> AsyncIterable[TaskOutput]:
        """
        Execute the agent task and yield task outputs.
        This method handles both streaming and non-streaming responses.
        """
        task_id = task_memento.task.task_id
        message = task_memento.task.message
        session_id = task_memento.task.sessionId

        # Extract user message
        user_message = self._extract_text_from_parts(message.parts)
        
        if not user_message:
            yield TaskOutput(
                artifact=self._create_text_artifact("No message content provided."),
            )
            return

        # Initialize conversation history for this session if needed
        if session_id not in self.conversation_history:
            self.conversation_history[session_id] = []

        # Add user message to history
        self.conversation_history[session_id].append({
            "role": "user",
            "content": user_message,
        })

        # Build context from history
        history_context = ""
        if len(self.conversation_history[session_id]) > 1:
            history_context = "Previous conversation:\n"
            for msg in self.conversation_history[session_id][:-1]:
                history_context += f"{msg['role']}: {msg['content']}\n"

        # Construct prompt with history
        full_prompt = f"{history_context}Current user message: {user_message}" if history_context else user_message

        # Emit "working" status
        yield TaskOutput(
            status=TaskStatus(
                state=TaskState.working,
                message=Message(
                    messageId=f"{task_id}-status",
                    role="agent",
                    parts=[TextPart(kind="text", text="Processing your request...")],
                ),
            ),
        )

        try:
            # Call Gemini API
            model = GenerativeModel(
                self.model_name,
                safety_settings=self.safety_settings,
                generation_config=self.generation_config,
            )

            # Generate response
            response = await asyncio.to_thread(
                model.generate_content,
                full_prompt
            )

            # Extract response text
            response_text = ""
            if response.parts:
                for part in response.parts:
                    if hasattr(part, "text"):
                        response_text += part.text
            
            if not response_text and hasattr(response, "text"):
                response_text = response.text

            # Add agent response to history
            self.conversation_history[session_id].append({
                "role": "model",
                "content": response_text,
            })

            # Emit the final response as artifact
            yield TaskOutput(
                artifact=self._create_text_artifact(response_text),
            )

            # Emit completed status
            yield TaskOutput(
                status=TaskStatus(
                    state=TaskState.completed,
                    message=Message(
                        messageId=f"{task_id}-complete",
                        role="agent",
                        parts=[TextPart(kind="text", text="Done")],
                    ),
                ),
                final=True,
            )

        except Exception as e:
            error_message = f"Error processing request: {str(e)}"
            yield TaskOutput(
                artifact=self._create_text_artifact(error_message),
            )
            yield TaskOutput(
                status=TaskStatus(
                    state=TaskState.failed,
                    message=Message(
                        messageId=f"{task_id}-error",
                        role="agent",
                        parts=[TextPart(kind="text", text=error_message)],
                    ),
                ),
                final=True,
            )

    async def cancel(self, task_memento: TaskMemento) -> TaskOutput:
        """Handle task cancellation."""
        task_id = task_memento.task.task_id
        session_id = task_memento.task.sessionId

        # Clear conversation history for this session
        if session_id in self.conversation_history:
            del self.conversation_history[session_id]

        return TaskOutput(
            status=TaskStatus(
                state=TaskState.canceled,
                message=Message(
                    messageId=f"{task_id}-canceled",
                    role="agent",
                    parts=[TextPart(kind="text", text="Task cancelled.")],
                ),
            ),
            final=True,
        )
