import concurrent.futures
from abc import ABC, abstractmethod
from typing import Any

import requests


class BaseRequest(ABC):
    @abstractmethod
    def __call__(self) -> Any:
        pass


class GetRequest(BaseRequest):
    def __init__(self, *args, **kwargs):
        self._args = args
        self._kwargs = kwargs

    def __call__(self):
        return requests.get(*self._args, **self._kwargs)


class PostRequest(BaseRequest):
    def __init__(self, *args, **kwargs):
        self._args = args
        self._kwargs = kwargs

    def __call__(self):
        return requests.post(*self._args, **self._kwargs)


class CRequestPool(object):
    def __init__(self, max_concurrent_requests: int):
        self._executor = concurrent.futures.ThreadPoolExecutor(max_concurrent_requests)
        self._futures = []

    def __del__(self):
        self._executor.shutdown(wait=False, cancel_futures=True)

    def _request_wrapper(self, request: BaseRequest):
        try:
            return request()
        except:
            return None

    def map(self, reqs: list):
        for req in reqs:
            self._futures.append(self._executor.submit(self._request_wrapper, req))

    def as_completed(self):
        return concurrent.futures.as_completed(self._futures)

    def cancel_all(self):
        for future in self._futures:
            future.cancel()
        self._futures = []
