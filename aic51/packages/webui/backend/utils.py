import logging
from urllib.parse import urlparse, urljoin
import concurrent.futures

import requests

logger = logging.getLogger(__name__)


class BaseRequest(object):
    pass


class GetRequest(BaseRequest):
    def __init__(self, *args, **kwargs):
        self.func = requests.get
        self.args = args
        self.kwargs = kwargs


class ConcurrentRequest(object):
    def __init__(self, gsize):
        self._executor = concurrent.futures.ThreadPoolExecutor(gsize)
        self._futures = []

    def __del__(self):
        self._executor.shutdown(wait=False, cancel_futures=True)

    def _request_wrapper(self, request):
        try:
            return request.func(*request.args, **request.kwargs)
        except Exception as e:
            return None

    def map(self, reqs):
        for req in reqs:
            self._futures.append(
                self._executor.submit(self._request_wrapper, req)
            )

    def as_completed(self):
        return concurrent.futures.as_completed(self._futures)

    def cancel_all(self):
        for future in self._futures:
            future.cancel()
        self._futures = []


def process_search_results(request, results):
    for id, frame in enumerate(results["frames"]):
        results["frames"][id] = process_frame_info(request, frame)
    return results


def process_frame_info(request, frame):
    domain = str(request.base_url)
    if frame["frame_uri"]:
        frame_uri = urlparse(frame["frame_uri"])
        frame["frame_uri"] = urljoin(domain, frame_uri.path)
    if frame["video_uri"]:
        video_uri = urlparse(frame["video_uri"])
        frame["video_uri"] = urljoin(domain, video_uri.path)
    return frame
