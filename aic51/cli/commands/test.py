"""
Test command for DRES mock server
"""

import uvicorn
from multiprocessing import Process

from aic51.packages.logger import logger
from .command import BaseCommand


class TestCommand(BaseCommand):
    """
    Command to start DRES mock server for testing API submissions
    """

    def __init__(self, *args, **kwargs):
        super(TestCommand, self).__init__(*args, **kwargs)

    def add_args(self, subparser):
        parser = subparser.add_parser(
            "test",
            help="Start DRES mock server for testing API submissions"
        )

        parser.add_argument(
            "--port",
            dest="port",
            type=int,
            default=8000,
            help="Port to run the mock server on (default: 8000)",
        )

        parser.set_defaults(func=self)

    def __call__(
        self,
        port: int,
        dev_mode: bool,
        verbose: bool,
        *args,
        **kwargs,
    ):
        """Start the DRES mock server"""
        from aic51.packages.test.dres_server import app

        logger.info("=" * 60)
        logger.info("Starting DRES Mock Server")
        logger.info("=" * 60)
        logger.info(f"Server URL: http://localhost:{port}")
        logger.info(f"API Documentation: http://localhost:{port}/docs")
        logger.info("")
        logger.info("Test credentials:")
        logger.info("  Username: team1")
        logger.info("  Password: password123")
        logger.info("")
        logger.info("Available endpoints:")
        logger.info(f"  POST http://localhost:{port}/api/v2/login")
        logger.info(f"  GET  http://localhost:{port}/api/v2/client/evaluation/list")
        logger.info(f"  POST http://localhost:{port}/api/v2/submit/{{evaluationID}}")
        logger.info(f"  GET  http://localhost:{port}/health")
        logger.info("=" * 60)

        try:
            uvicorn.run(
                app,
                host="0.0.0.0",
                port=port,
                log_level="info" if verbose else "warning",
            )
        except KeyboardInterrupt:
            logger.info("\nShutting down DRES mock server...")