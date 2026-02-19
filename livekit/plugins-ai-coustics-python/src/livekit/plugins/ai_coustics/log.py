import logging, time


class ThrottlingFilter(logging.Filter):
    """
    A logging filter that throttles repeated log messages.
    """

    def __init__(self, interval=5):
        super().__init__()
        self.interval = interval
        self.last_logged = {}

    def filter(self, record):
        now = time.time()
        key = (record.levelno, record.msg)
        if now - self.last_logged.get(key, 0) > self.interval:
            self.last_logged[key] = now
            return True
        return False


logger = logging.getLogger("livekit.plugins.ai_coustics")
logger.addFilter(ThrottlingFilter())
