import random

with open('names.txt') as f:
    names = [tuple(l.split()) for l in f.read().splitlines()]


def chunkIt(seq, num):
    avg = len(seq) / float(num)
    out = []
    last = 0.0

    while last < len(seq):
        out.append(seq[int(last):int(last + avg)])
        last += avg

    return out


def to():
    first, last = random.choice(names)
    return f'{first} {last}'


def frm(t):
    user = random.choice(names)
    if user == t:
        return frm(t)
    first, last = user
    return f'{first} {last}'


def title(body):
    n = random.randint(1, 5)
    words = body.split()
    title = words[len(words) // 2:len(words) // 2 + n + 1]
    return ' '.join(title)


with open('emails.txt') as f:
    bodies = f.read().splitlines()
    t = to()
    emails = [(t, frm(t), title(b), b) for b in bodies]
emails.append((
    'Roma Wooden',
    'Alfonso Polaris',
    'ENCRYPTION',
    'the key is XXXXXX'
))
random.shuffle(emails)
print(emails)

f = open('emails.json', 'w')


def mprint(*args, **kwargs):
    print(*args, **kwargs)
    print(*args, file=f, **kwargs)


random.seed(89123)

for j, mails in enumerate(chunkIt(emails, 15)):
    bin = random.randint(1000, 9999)
    mprint(f'"mails_{bin}": {{')
    mprint('"!files": [')

    for i, mail in enumerate(mails):
        id = random.randint(1000000, 9999999)
        mprint('{')
        mprint(f'"name": "saved_email_{id}.txt",')
        mprint(f'"content": [')
        mprint(f'"To: {mail[0]}",')
        mprint(f'"From: {mail[1]}",')
        mprint(f'"Subject: {mail[2]}",')
        mprint(f'"{mail[3]}"')
        mprint(f']')
        mprint(f"}}{'' if i == len(mails) - 1 else ','}")

    mprint(']')
    mprint(f"}}{'' if j == 14 else ','}")
