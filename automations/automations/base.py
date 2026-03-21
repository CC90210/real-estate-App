"""
Base automation class and registry for the PropFlow Automation Framework.

Every concrete automation inherits from BaseAutomation and implements:
  - validate(trigger) -> bool      — fast pre-flight check
  - execute(trigger) -> AutomationResult — the actual work

The AutomationRegistry maps event_type strings to handler classes and
provides the single dispatch entry point used by the API layer.
"""

from __future__ import annotations

import logging
from abc import ABC, abstractmethod
from datetime import datetime, timezone
from typing import Type

from models.schemas import AutomationResult, AutomationStatus, AutomationTrigger
from services.supabase_client import SupabaseService

logger = logging.getLogger(__name__)


class BaseAutomation(ABC):
    """
    Abstract base for all PropFlow automation handlers.

    Subclasses must implement `validate` and `_run`.
    The public `execute` method wraps `_run` with:
      - Pre-flight validation
      - Automatic log creation / update in automation_logs
      - Guaranteed exception catching so a buggy handler never crashes
        the entire server
    """

    automation_type: str = "base"

    def __init__(self) -> None:
        self._svc = SupabaseService()

    # ------------------------------------------------------------------
    # Public entry point (called by the registry / API layer)
    # ------------------------------------------------------------------

    async def execute(self, trigger: AutomationTrigger) -> AutomationResult:
        """
        Run the automation with full logging and error safety.

        Always returns an AutomationResult — never raises.
        """
        log_id: str | None = None

        # Create a pending log entry immediately so we have a record even if
        # execution fails before reaching the final update.
        log_id = self._svc.save_automation_log(
            company_id=trigger.company_id,
            automation_type=self.automation_type,
            status=AutomationStatus.PENDING,
            details={"event_type": trigger.event_type.value},
        )

        # Pre-flight validation
        try:
            if not self.validate(trigger):
                reason = f"Validation failed for {self.automation_type}"
                self._update_log(log_id, AutomationStatus.SKIPPED, reason)
                return AutomationResult(
                    success=False,
                    automation_type=self.automation_type,
                    company_id=trigger.company_id,
                    log_id=log_id,
                    message=reason,
                )
        except Exception as exc:
            reason = f"Validation raised exception: {exc}"
            logger.exception(
                "Validation error in %s for company_id=%s",
                self.automation_type,
                trigger.company_id,
            )
            self._update_log(log_id, AutomationStatus.FAILED, reason)
            return AutomationResult(
                success=False,
                automation_type=self.automation_type,
                company_id=trigger.company_id,
                log_id=log_id,
                message=reason,
            )

        # Mark processing
        self._update_log(log_id, AutomationStatus.PROCESSING)

        # Run the automation
        try:
            result = await self._run(trigger)
            result.log_id = result.log_id or log_id

            final_status = (
                AutomationStatus.SUCCESS if result.success else AutomationStatus.FAILED
            )
            self._update_log(
                log_id,
                final_status,
                error_message=None if result.success else result.message,
                details=result.details,
            )
            return result

        except Exception as exc:
            error_msg = f"Unhandled exception in {self.automation_type}: {exc}"
            logger.exception(
                "Unhandled error in %s for company_id=%s",
                self.automation_type,
                trigger.company_id,
            )
            self._update_log(log_id, AutomationStatus.FAILED, error_msg)
            return AutomationResult(
                success=False,
                automation_type=self.automation_type,
                company_id=trigger.company_id,
                log_id=log_id,
                message=error_msg,
            )

    # ------------------------------------------------------------------
    # Abstract interface for subclasses
    # ------------------------------------------------------------------

    @abstractmethod
    def validate(self, trigger: AutomationTrigger) -> bool:
        """
        Return True if the trigger has the minimum required payload fields.

        This is called before any I/O — keep it cheap.
        """
        ...

    @abstractmethod
    async def _run(self, trigger: AutomationTrigger) -> AutomationResult:
        """
        Execute the automation business logic.

        May raise exceptions — BaseAutomation.execute() will catch them.
        Should return AutomationResult with success=False and a meaningful
        message on partial failure rather than raising when possible.
        """
        ...

    # ------------------------------------------------------------------
    # Protected helpers available to all subclasses
    # ------------------------------------------------------------------

    def _require_payload_keys(
        self, trigger: AutomationTrigger, *keys: str
    ) -> bool:
        """Return True only when all specified keys are present and non-empty."""
        for key in keys:
            value = trigger.payload.get(key)
            if value is None or (isinstance(value, str) and not value.strip()):
                logger.warning(
                    "%s: missing required payload key '%s' for company_id=%s",
                    self.automation_type,
                    key,
                    trigger.company_id,
                )
                return False
        return True

    def _update_log(
        self,
        log_id: str | None,
        status: AutomationStatus,
        error_message: str | None = None,
        details: dict | None = None,
    ) -> None:
        """Best-effort log update — never raises."""
        if not log_id:
            return
        try:
            self._svc.update_automation_log_status(
                log_id=log_id,
                status=status,
                error_message=error_message,
                details=details,
            )
        except Exception:
            logger.warning("Could not update log_id=%s to %s", log_id, status)


# ---------------------------------------------------------------------------
# Registry
# ---------------------------------------------------------------------------

class AutomationRegistry:
    """
    Maps event_type strings to their handler classes.

    Usage:
        registry = AutomationRegistry()
        registry.register("APPLICATION_SUBMITTED", ApplicationProcessorAutomation)
        result = await registry.dispatch(trigger)
    """

    def __init__(self) -> None:
        self._handlers: dict[str, Type[BaseAutomation]] = {}

    def register(
        self, event_type: str, handler_class: Type[BaseAutomation]
    ) -> None:
        self._handlers[event_type] = handler_class
        logger.debug("Registered automation handler: %s -> %s", event_type, handler_class.__name__)

    async def dispatch(self, trigger: AutomationTrigger) -> AutomationResult:
        """
        Find and execute the handler for the given event_type.

        Returns a skipped result if no handler is registered rather than raising.
        """
        handler_class = self._handlers.get(trigger.event_type.value)

        if not handler_class:
            msg = f"No handler registered for event_type={trigger.event_type.value}"
            logger.warning(msg)
            return AutomationResult(
                success=False,
                automation_type="unregistered",
                company_id=trigger.company_id,
                message=msg,
            )

        handler = handler_class()
        return await handler.execute(trigger)

    def registered_events(self) -> list[str]:
        return list(self._handlers.keys())
