import random
import string

drvs = string.ascii_uppercase[:17]
big = ['M', 'N', 'O']

for i in range(20):
    print('{')
    print(f'"name": "mlblog_{random.randint(100000, 1000000)}.txt",')
    print('"content": [')

    for drv in drvs:
        total = random.randint(20, 38)
        used = random.randint(15, total - 5)
        com = '' if drv == drvs[-1] else ','
        print(f'"{drv}   {total} mlb   {used} mlb   {total - used: 2d} mlb"{com}')

    print(']')
    print('},')
