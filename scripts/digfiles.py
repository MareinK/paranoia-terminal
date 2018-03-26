import random
import string

f = open('digfiles.json', 'w')


def mprint(*args, **kwargs):
    print(*args, **kwargs)
    print(*args, file=f, **kwargs)


random.seed(89123)

n = 276
for i in range(n):
    mprint('{')
    parta = ''.join(random.choices(string.digits, k=12))
    partb = ''.join(random.choices(string.ascii_lowercase, k=7))
    mprint(f'"name": "{parta}_{partb}.dig",')
    mprint(f'"content": [')
    mprint('"~ command terminal cannot display this type of file"')
    mprint(f']')
    mprint(f"}}{'' if i == n - 1 else ','}")
