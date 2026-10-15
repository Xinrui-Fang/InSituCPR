import os
import re

DEFAULT_MODEL = os.getenv("OPENAI_MODEL", "gpt-5.6-sol")
FALLBACK_MODELS = ("gpt-4o", "gpt-4.1")
_CITATION_MARKERS = re.compile(r"【[^】]*】")
_active_model = None


class ResearchAssistantManager:
    def __init__(self, client):
        """
        Initialize the ResearchAssistantManager.

        :param client: An instance of the OpenAI client
        """
        self.client = client

    def respond(self, instructions, user_input, vector_store_id=None, model=None):
        """
        Run one Responses API call. An existing vector store is attached
        through file_search and is not recreated.
        """
        kwargs = {
            "model": model or DEFAULT_MODEL,
            "instructions": instructions,
            "input": user_input,
        }
        if vector_store_id:
            kwargs["tools"] = [{
                "type": "file_search",
                "vector_store_ids": [vector_store_id],
            }]

        response = _create_response(self.client, kwargs)
        text = _message_text(response)
        text = _CITATION_MARKERS.sub("", text).strip()
        citations = _citation_labels(response)

        print("Response ID:", getattr(response, "id", None))
        print("Response status:", getattr(response, "status", None))
        if citations:
            print("\n".join(citations))
        if not text:
            raise RuntimeError("No messages returned from the API")
        return text


def _model_candidates(explicit_model):
    global _active_model
    candidates = []
    for name in (explicit_model, _active_model, DEFAULT_MODEL, *FALLBACK_MODELS):
        if name and name not in candidates:
            candidates.append(name)
    return candidates


def _model_unavailable(error):
    message = str(error).lower()
    return any(phrase in message for phrase in (
        "model_not_found",
        "does not exist",
        "do not have access",
        "not available",
        "invalid model",
    ))


def _create_response(client, kwargs):
    global _active_model
    explicit_model = kwargs.get("model")
    last_error = None
    for model_name in _model_candidates(explicit_model):
        try:
            response = client.responses.create(**{**kwargs, "model": model_name})
            _active_model = model_name
            return response
        except Exception as error:
            last_error = error
            if _model_unavailable(error):
                print(f"Model {model_name} unavailable: {error}")
                continue
            raise
    raise last_error


def _message_text(response):
    text = getattr(response, "output_text", None)
    if text:
        return text

    parts = []
    for item in getattr(response, "output", []) or []:
        if getattr(item, "type", None) != "message":
            continue
        for content in getattr(item, "content", []) or []:
            value = getattr(content, "text", None)
            if value:
                parts.append(value)
    return "\n".join(parts)


def _citation_labels(response):
    labels = []
    seen = set()
    for item in getattr(response, "output", []) or []:
        if getattr(item, "type", None) != "message":
            continue
        for content in getattr(item, "content", []) or []:
            for annotation in getattr(content, "annotations", None) or []:
                if getattr(annotation, "type", None) != "file_citation":
                    continue
                filename = getattr(annotation, "filename", None) or getattr(annotation, "file_id", "")
                if not filename or filename in seen:
                    continue
                seen.add(filename)
                labels.append(f"[{len(labels)}] {filename}")
    return labels
