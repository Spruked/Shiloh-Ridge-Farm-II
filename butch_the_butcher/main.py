#!/usr/bin/env python3
"""
Butch the Butcher - Standalone Service
"""
import os
import uvicorn
import logging
import sys

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler("butch.log")
    ]
)

logger = logging.getLogger(__name__)

if __name__ == "__main__":
    logger.info("Starting Butch the Butcher Service...")
    port = int(os.environ.get('BUTCH_PORT', '8001'))
    host = os.environ.get('BUTCH_HOST', '0.0.0.0')
    uvicorn.run(
        "api.butch_endpoints:app",
        host=host,
        port=port,
        reload=False,
        log_level="info"
    )
