from .base import BaseAutomation, AutomationRegistry
from .document_sender import DocumentSenderAutomation
from .application_processor import ApplicationProcessorAutomation
from .follow_up import FollowUpAutomation
from .listing_poster import ListingPosterAutomation

__all__ = [
    "BaseAutomation",
    "AutomationRegistry",
    "DocumentSenderAutomation",
    "ApplicationProcessorAutomation",
    "FollowUpAutomation",
    "ListingPosterAutomation",
]

# Register all handlers at import time so api/routes.py just calls dispatch()
_registry = AutomationRegistry()
_registry.register("DOCUMENT_SEND", DocumentSenderAutomation)
_registry.register("LEASE_GENERATED", DocumentSenderAutomation)
_registry.register("APPLICATION_SUBMITTED", ApplicationProcessorAutomation)
_registry.register("FOLLOW_UP_DUE", FollowUpAutomation)
_registry.register("LISTING_PUBLISHED", ListingPosterAutomation)


def get_registry() -> AutomationRegistry:
    return _registry
