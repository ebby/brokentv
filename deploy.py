#!/usr/bin/env python
import os
import subprocess

def main():
  
  # BUILD THE JS
  call_command('java -jar plovr.jar build js/main-prod.config')
  call_command('java -jar plovr.jar build js/mobile-prod.config')
  
  # DEPLOY TO APPENGINE
  call_command('appcfg.py update .')
  

def call_command(command):
  process = subprocess.Popen(command.split(' '),
                             stdout=subprocess.PIPE,
                             stderr=subprocess.PIPE)
  return process.communicate()
  
if __name__ == "__main__":
    main()