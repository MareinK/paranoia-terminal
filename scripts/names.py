import random

with open('names.txt') as f:
    names = [tuple(l.split()) for l in f.read().splitlines()]

bins = ['abcd', 'efgh', 'ijkl', 'mnop', 'qrst', 'uvwx', 'yz']

f = open('names.json', 'w')


def mprint(*args, **kwargs):
    print(*args, **kwargs)
    print(*args, file=f, **kwargs)


random.seed(89123)

alfonso = ('Alfonso', 'Polaris')
groups = ['spindlers', 'timeweavers', 'graphers', 'diggers',
          'mancers', 'mandators', 'biologons', 'nethermen', 'scribes']
spindlers = []

for bin in bins:
    mprint(f'"{bin[0]}_to_{bin[-1]}": {{')
    mprint('"!files": [')

    binnames = set(n for n in names if n[0][0].lower() in bin)

    if 'a' in bin:
        binnames.add(alfonso)

    for i, name in enumerate(sorted(binnames)):
        first, last = name
        username = first.lower() + last.lower()[0]
        group = random.choice(groups)
        if name == alfonso:
            group = 'spindlers'
        if group == 'spindlers':
            spindlers.append(username)
        mprint('{')
        mprint(f'"name": "{username}.txt",')
        mprint(f'"content": [')
        mprint(f'"FIRSTNAME: {first}",')
        mprint(f'"LASTNAME:  {last}",')
        mprint(f'"USERNAME:  {username}",')
        mprint(f'"GROUP:     {group}"')
        mprint(f']')
        mprint(f"}}{'' if i == len(binnames) - 1 else ','}")

    mprint(']')
    mprint(f"}}{'' if bin == bins[-1] else ','}")

print(spindlers)