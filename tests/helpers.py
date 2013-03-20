import base64
import pickle

def run_tasks_deep(queue, name):
  tasks = queue.GetTasks(name)
  print '\n'
  while tasks:
    for task in tasks:
      print task['name']
      (func, args, opts) = pickle.loads(base64.b64decode(task['body']))
      func(*args)
    tasks = queue.GetTasks(name)
    tasks.FlushQueue(name)

def run_tasks_shallow(queue, name):
  tasks = queue.GetTasks(name)
  print '\n'
  for task in tasks:
    print task['name']
    (func, args, opts) = pickle.loads(base64.b64decode(task['body']))
    func(*args)