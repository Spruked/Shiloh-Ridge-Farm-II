#!/usr/bin/env python3
import os
import uvicorn
from shiloh_voice_system.api.voice_endpoints import app

if __name__ == '__main__':
    port = int(os.environ.get('VOICE_PORT', '8000'))
    host = os.environ.get('VOICE_HOST', '0.0.0.0')
    uvicorn.run(app, host=host, port=port)
