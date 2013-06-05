#!/usr/bin/env python
import os
import subprocess
import logging

logging.basicConfig(level=logging.INFO,
                    format='%(asctime)s %(levelname)s %(message)s')

def main():
  
  # BUILD THE JS
  stdout,stderr = call_command('java -jar plovr.jar build js/main-prod.config')
  logging.info(stderr)
  logging.info(stdout)
  
  stdout,stderr = call_command('java -jar plovr.jar build js/main-debug.config')
  logging.info(stderr)
  logging.info(stdout)
  
  stdout,stderr = call_command('java -jar plovr.jar build js/mobile-prod.config')
  logging.info(stderr)
  logging.info(stdout)
#  
#  # DEPLOY TO APPENGINE
  stdout,stderr = call_command('appcfg.py update .')
  logging.info(stderr)
  logging.info(stdout)
  

def call_command(command):
  process = subprocess.Popen(command.split(' '),
                             stdout=subprocess.PIPE,
                             stderr=subprocess.PIPE)
  return process.communicate()
  
if __name__ == "__main__":
    main()