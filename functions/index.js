const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp(functions.config().firebase);

const seedrandom = require('seedrandom');
var structure = require('./structure.json')

/////////////////
/// MACHINERY ///
/////////////////

var start_e = 6.084349;
var start_n = 50.798604;

var goal_e = 6.062361;
var goal_n = 50.735722;

var km_e = 70;
var km_n = 111;

var dist_km = Math.sqrt(Math.pow((start_n - goal_n) * km_n, 2) + Math.pow((start_e - goal_e) * km_e, 2))

var approx_steps = 10;
var step_km = dist_km / approx_steps;
var step_e = step_km / km_e;
var step_n = step_km / km_n;

var start_x = Math.round((start_e - goal_e) / step_e);
var start_y = Math.round((start_n - goal_n) / step_n);

var reveal_count = 20;

exports.initialiseUser = functions.auth.user().onCreate(event => {
    var uid = event.data.uid;
    admin.database().ref('drive').child(uid).set('a');
    admin.database().ref('directory').child(uid).set('');
    admin.database().ref('waiting').child(uid).set(true);
    admin.database().ref('gps').child(uid).set({ 'x': start_x, 'y': start_y });

    var fmt = { id: getRandomInt(15, 95) };
    messages(uid, terminal_output.initialise_user, fmt);

    admin.database().ref('waiting').child(uid).set(false);

    admin.database().ref('p_visited').child(uid).set(false);
    admin.database().ref('gpsdig_tried').child(uid).set(false);
    admin.database().ref('reveal_count').child(uid).set(0);

    return 0;
});

exports.sendCommand = functions.https.onCall((data, context) => {
    var uid = context.auth.uid;
    admin.database().ref('messages').child(uid).push('$ ' + data);

    var parts = data.toLowerCase().trim().split(/\s+/);
    var command = parts[0];
    var args = parts.slice(1);

    var func;
    switch (command) {
        case 'dir':
            func = command_dir
            break;
        case 'enter':
            func = command_enter
            break;
        case 'leave':
            func = command_leave
            break;
        case 'shodrv':
            func = command_shodrv
            break;
        case 'setdrv':
            func = command_setdrv
            break;
        case 'list':
            func = command_list
            break;
        case 'show':
            func = command_show
            break;
        case "despool":
            func = command_despool;
            break;
        case "status":
            func = command_status;
            break;
        case "help":
            func = command_help;
            break;
        case "upspin":
            func = command_upspin;
            break;
        case "weave":
            func = command_weave;
            break;
        case "digger":
            func = command_digger;
            break;
        case "graph":
            func = command_graph;
            break;
        case "$id":
            func = command_id;
            break;
        case "$release":
            func = command_release;
            break;
        case "$clear":
            func = command_clear;
            break;
        case "$break":
            func = command_break;
            break;
        default:
            func = command_unknown;
            break;
    }
    func(uid, args).then(() => {
        admin.database().ref('waiting').child(uid).set(false);

        var p_ref = admin.database().ref('p_visited').child(uid);
        var gps_ref = admin.database().ref('gpsdig_tried').child(uid);
        var reveal_ref = admin.database().ref('reveal_count').child(uid);
        p_ref.once('value', p_snapshot => {
            gps_ref.once('value', gps_snapshot => {
                reveal_ref.once('value', reveal_snapshot => {
                    if (p_snapshot.val() && gps_snapshot.val())
                        reveal_ref.set(reveal_snapshot.val() + 1, () => {
                            if (reveal_snapshot.val() + 1 === reveal_count) {
                                message(uid, '');
                                message(uid, '                              ~~~~~~');
                                message(uid, '');
                                message(uid, 'The second piece of information for the puzzle is now revealed:');
                                message(uid, '');
                                message(uid, '                        username: alfonsop');
                                message(uid, '                        password: eldiablo');
                                message(uid, '');
                                message(uid, '                              ~~~~~~');
                                message(uid, '');
                            }
                        });
                });
            });
        });

        return 0;
    }).catch(err => {
        admin.database().ref('disabled').child(uid).set(true);
        message(uid, '!! unrecoverable internal error:');
        message(uid, '!! ' + err);
        message(uid, '!! unable to recover command terminal');
        message(uid, '!! please notify system administrators');
        return 0;
    });
});

function message(uid, message, fmt) {
    if (!message)
        message = '  ';
    if (fmt)
        for (var key in fmt)
            message = message.replace('{{' + key + '}}', fmt[key])
    admin.database().ref('messages').child(uid).push('  ' + message);
}

function messages(uid, messages, fmt) {
    for (var i = 0; i < messages.length; i++)
        message(uid, messages[i], fmt);
}

function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

////////////////
/// COMMANDS ///
////////////////

function command_status(uid, args) {
    return new Promise((resolve, reject) => {
        var deps_ref = admin.database().ref('devices').child(uid);
        deps_ref.once('value', snapshot => {
            var val = snapshot.val();
            var fmt = {
                busy: getRandomInt(5, 15),
                drvman: val && val.drvman ? 'on' : 'off',
                datweave: val && val.datweave ? 'on' : 'off',
                termgraph: val && val.termgraph ? 'on' : 'off',
                gpsdig: val && val.gpsdig ? 'on' : 'off'
            };
            messages(uid, terminal_output.status, fmt);
            resolve();
        });
    });
}

function command_help(uid, args) {
    return new Promise((resolve, reject) => {
        if (args.length === 0) {
            messages(uid, terminal_output.help);
            resolve();
        } else {
            switch (args[0]) {
                case 'dir':
                    messages(uid, terminal_output.help_dir)
                    break;
                case 'help':
                    messages(uid, terminal_output.help_help)
                    break;
                case 'status':
                    messages(uid, terminal_output.help_status)
                    break;
                case 'enter':
                    messages(uid, terminal_output.help_enter)
                    break;
                case 'leave':
                    messages(uid, terminal_output.help_leave)
                    break;
                case 'shodrv':
                    messages(uid, terminal_output.help_shodrv)
                    break;
                case 'setdrv':
                    messages(uid, terminal_output.help_setdrv)
                    break;
                case 'list':
                    messages(uid, terminal_output.help_list)
                    break;
                case 'show':
                    messages(uid, terminal_output.help_show)
                    break;
                case 'despool':
                    messages(uid, terminal_output.help_despool)
                    break;
                case 'upspin':
                    messages(uid, terminal_output.help_upspin)
                    break;
                case 'weave':
                    messages(uid, terminal_output.help_weave)
                    break;
                case 'digger':
                    messages(uid, terminal_output.help_digger)
                    break;
                case 'graph':
                    messages(uid, terminal_output.help_graph)
                    break;
                default:
                    message(uid, terminal_output.help_unknown)
                    break;
            }
            resolve();
        }
    });
}

function command_despool(uid, args) {
    return new Promise((resolve, reject) => {
        if (args && args[0] === 'confirm') {
            messages(uid, terminal_output.signout);
            admin.auth().deleteUser(uid);
            admin.database().ref('signout').child(uid).set(true);
        } else {
            messages(uid, terminal_output.signout_confirm);
            resolve();
        }
    });
}

function command_unknown(uid, args) {
    return new Promise((resolve, reject) => {
        messages(uid, terminal_output.unknown);
        resolve();
    });
}

function command_dir(uid, args) {
    return new Promise((resolve, reject) => {
        var dir_ref = admin.database().ref('directory').child(uid);
        dir_ref.once('value', snapshot => {
            message(uid, ("/" + snapshot.val() + "/").replace('//', '/'));
            resolve();
        });
    });
}

function command_enter(uid, args) {
    return new Promise((resolve, reject) => {
        if (args.length === 0) {
            message(uid, '!! missing argument');
            resolve();
            return;
        }
        var drive_ref = admin.database().ref('drive').child(uid);
        drive_ref.once('value', drive_snapshot => {
            var dir_ref = admin.database().ref('directory').child(uid);
            dir_ref.once('value', dir_snapshot => {
                var struct_ref = admin.database().ref('structure').child(drive_snapshot.val()).child('/' + dir_snapshot.val());
                struct_ref.once('value', struct_snapshot => {
                    var exists;
                    try {
                        exists = struct_snapshot.hasChild(args[0]);
                    } catch (error) {
                        exists = false;
                    }
                    if (exists) {
                        var new_struct_ref = struct_ref.child(args[0]);
                        var new_dir = new_struct_ref.toString().replace(/^.+?structure\/.\//, '');
                        dir_ref.set(new_dir, () => {
                            message(uid, '~ entered directory ' + args[0]);
                            resolve();
                        });
                    } else {
                        message(uid, '!! cannot enter: no such directory');
                        resolve();
                    }
                });
            });
        });
    });
}

function command_leave(uid, args) {
    return new Promise((resolve, reject) => {
        var dir_ref = admin.database().ref('directory').child(uid);
        dir_ref.once('value', dir_snapshot => {
            var dir = dir_snapshot.val();
            if (dir === '') {
                message(uid, '!! cannot leave: at top directory');
                resolve();
            } else {
                var new_dir;
                if (dir.match('/'))
                    new_dir = dir.replace(/\/[^/]+?$/, '');
                else
                    new_dir = '';
                dir_ref.set(new_dir, () => {
                    if (new_dir === '') {
                        message(uid, '~ entered top directory');
                        resolve();
                    }
                    else {
                        message(uid, '~ entered directory ' + new_dir);
                        resolve();
                    }
                });
            }
        });
    });
}

function command_shodrv(uid, args) {
    return new Promise((resolve, reject) => {
        var drvman_ref = admin.database().ref('devices').child(uid).child('drvman');
        drvman_ref.once('value', snapshot => {
            if (!snapshot.val()) {
                message(uid, '!! dependency DRVMAN is offline, enable and retry');
                resolve();
            } else {
                var drive_ref = admin.database().ref('drive').child(uid);
                drive_ref.once('value', snapshot => {
                    message(uid, snapshot.val().toUpperCase());
                    resolve();
                });
            }
        });
    });
}

var open_drives = ['a', 'b', 'd', 'f'];
var key_drives = ['c', 'p']
var corr_drives = ['e', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'q']
var drive_key = 'charles';

function command_setdrv(uid, args) {
    return new Promise((resolve, reject) => {
        if (args.length === 0) {
            message(uid, '!! missing argument');
            resolve();
            return;
        }
        var drive_ref = admin.database().ref('drive').child(uid);
        var dir_ref = admin.database().ref('directory').child(uid);
        var drvman_ref = admin.database().ref('devices').child(uid).child('drvman');
        drvman_ref.once('value', drvman_snapshot => {
            drive_ref.once('value', drive_snapshot => {
                if (!drvman_snapshot.val()) {
                    message(uid, '!! dependency DRVMAN is offline, enable and retry');
                } else {
                    if (open_drives.includes(args[0])) {
                        message(uid, '~ decoupling current drive...');
                        message(uid, '~ drive decoupled, terminal in floating state!');
                        message(uid, '~ encoupling drive ' + args[0].toUpperCase() + '...');
                        message(uid, "");
                        message(uid, "////////////////////////////////");
                        message(uid, "/// NOW CONNECTED TO DRIVE " + args[0].toUpperCase() + " ///");
                        message(uid, "////////////////////////////////");
                        message(uid, "");
                        drive_ref.set(args[0]);
                        dir_ref.set('');
                    } else if (key_drives.includes(args[0])) {
                        if (args.length > 1 && args[1] === drive_key) {
                            message(uid, '~ decoupling current drive...');
                            message(uid, '~ drive decoupled, terminal in floating state!');
                            message(uid, '~ encoupling drive ' + args[0].toUpperCase() + '...');
                            message(uid, '~ attempting decryption with key ' + args[1].toUpperCase() + '...');
                            message(uid, '~ decryption successful!');
                            message(uid, "");
                            message(uid, "////////////////////////////////");
                            message(uid, "/// NOW CONNECTED TO DRIVE " + args[0].toUpperCase() + " ///");
                            message(uid, "////////////////////////////////");
                            message(uid, "");
                            drive_ref.set(args[0]);
                            dir_ref.set('');
                            if (args[0] === 'p')
                                admin.database().ref('p_visited').child(uid).set(true);
                        } else if (args.length > 1 && args[1] !== drive_key) {
                            message(uid, '~ decoupling current drive...');
                            message(uid, '~ drive decoupled, terminal in floating state!');
                            message(uid, '~ encoupling drive ' + args[0].toUpperCase() + '...');
                            message(uid, '~ attempting decryption with key ' + args[1].toUpperCase() + '...');
                            message(uid, '!! ERR218: INVALID DECRYPTION KEY');
                            message(uid, '~ falling back to previous drive...');
                            message(uid, '~ drive ' + drive_snapshot.val().toUpperCase() + ' recoupled');
                        } else {
                            message(uid, '~ decoupling current drive...');
                            message(uid, '~ drive decoupled, terminal in floating state!');
                            message(uid, '~ encoupling drive ' + args[0].toUpperCase() + '...');
                            message(uid, '!! ERR217: DRIVE ENCRYPTED, DECRYPTION KEY REQUIRED');
                            message(uid, '~ falling back to previous drive...');
                            message(uid, '~ drive ' + drive_snapshot.val().toUpperCase() + ' recoupled');
                            message(uid, "");
                        }
                    } else if (corr_drives.includes(args[0])) {
                        message(uid, '~ decoupling current drive...');
                        message(uid, '~ drive decoupled, terminal in floating state!');
                        message(uid, '~ encoupling drive ' + args[0].toUpperCase() + '...');
                        message(uid, '!! ERR205: DRIVE MACHINERY CORRUPTED');
                        message(uid, '~ falling back to previous drive...');
                        message(uid, '~ drive ' + drive_snapshot.val().toUpperCase() + ' recoupled');
                    } else {
                        message(uid, '!! drive not found');
                    }
                }
                resolve();
            });
        });
    });
}

function command_list(uid, args) {
    return new Promise((resolve, reject) => {
        var drive_ref = admin.database().ref('drive').child(uid);
        drive_ref.once('value', drive_snapshot => {
            var dir_ref = admin.database().ref('directory').child(uid);
            dir_ref.once('value', dir_snapshot => {
                var struct_ref = admin.database().ref('structure').child(drive_snapshot.val()).child('/' + dir_snapshot.val());
                struct_ref.once('value', struct_snapshot => {
                    if (struct_snapshot.hasChildren()) {
                        struct_snapshot.forEach(child_snapshot => {
                            if (child_snapshot.key === '!files')
                                child_snapshot.forEach(file_snapshot => {
                                    message(uid, file_snapshot.child('name').val());
                                });
                            else
                                message(uid, child_snapshot.key + '/');
                        });
                    } else
                        message(uid, '~ directory is empty');
                    resolve();
                });
            });
        });
    });
}

function command_show(uid, args) {
    return new Promise((resolve, reject) => {
        if (args.length === 0) {
            message(uid, '!! missing argument');
            resolve();
            return;
        }
        var drive_ref = admin.database().ref('drive').child(uid);
        drive_ref.once('value', drive_snapshot => {
            var dir_ref = admin.database().ref('directory').child(uid);
            dir_ref.once('value', dir_snapshot => {
                var struct_ref = admin.database().ref('structure').child(drive_snapshot.val()).child('/' + dir_snapshot.val());
                struct_ref.once('value', struct_snapshot => {
                    var found = false;
                    if (struct_snapshot.hasChildren() && struct_snapshot.hasChild('!files'))
                        struct_snapshot.child('!files').forEach(file_snapshot => {
                            if (file_snapshot.child('name').val() === args[0]) {
                                if (args[0].endsWith('.gph'))
                                    message(uid, "!! 'show' command cannot display .gph files. try 'graph' command instead.");
                                else if (!file_snapshot.hasChild('content'))
                                    message(uid, "!! 'show' command cannot display " + (args[0].includes('.') ? '.' : '') + args[0].split('.').slice(-1) + " files.");
                                else
                                    messages(uid, file_snapshot.child('content').val());
                                found = true;
                            }
                        });
                    if (!found)
                        message(uid, '!! there is no file with that name');
                    resolve();
                });
            });
        });
    });
}

var spingroup = ['adalineb', 'albertaw', 'alfonsop', 'althear', 'antionettel', 'arthurd', 'audrial', 'averym', 'brunildad', 'charlenes', 'christined', 'concepcionc', 'darleneg', 'daryll', 'delilag', 'dericko', 'dorianc', 'eds', 'elvas', 'emilior', 'ericg', 'ericap', 'ermaj', 'fayet', 'frederica', 'genaw', 'glenniep', 'gradyo', 'gwenl', 'hopeh', 'hyor', 'inezh', 'irisb', 'janh', 'jazminep', 'jeanmarieb', 'jeanniec', 'joannas', 'joshuao', 'josphinej', 'kaseys', 'keithm', 'kelleey', 'kellyey', 'kristeenc', 'lakeeshad', 'lakeshiah', 'lancem', 'lesleyb', 'lesliel', 'leslieo', 'lorrianes', 'malorieh', 'marlenan', 'marlonw', 'martym', 'mattiet', 'melodye', 'michelc', 'mirav', 'monan', 'otisw', 'pac', 'pamelas', 'pauletteg', 'romaw', 'rosemaryf', 'shelaj', 'shylan', 'soniak', 'terrancem', 'unal', 'velmas', 'vivienc', 'warrenm', 'yoshikoh'];
var password = 'eldiablo';

function command_upspin(uid, args) {
    return new Promise((resolve, reject) => {
        if (args.length === 0) {
            message(uid, '!! missing argument');
        }
        else if (['splup', 'connman', 'help', 'drvman'].includes(args[0])) {
            message(uid, '~ spinning up device ' + args[0].toUpperCase() + '...');
            message(uid, '~ ' + args[0].toUpperCase() + ' system enabled');
            admin.database().ref('devices').child(uid).child(args[0]).set(true);
        }
        else if (['datweave', 'termgraph'].includes(args[0])) {
            if (args.length < 2) {
                message(uid, '~ spinning up device ' + args[0].toUpperCase() + '...');
                message(uid, '!! device is privileged! please supply a username to enable');
                message(uid, '!! failed to enable system ' + args[0].toUpperCase());
            } else if (!spingroup.includes(args[1])) {
                message(uid, '~ spinning up device ' + args[0].toUpperCase() + ' as user ' + args[1].toUpperCase() + '...');
                message(uid, "!! device is privileged! user must be a member of group 'spindlers'");
                message(uid, '!! failed to enable system ' + args[0].toUpperCase());
            } else {
                message(uid, '~ spinning up device ' + args[0].toUpperCase() + ' as user ' + args[1].toUpperCase() + '...');
                message(uid, '~ ' + args[0].toUpperCase() + ' system enabled');
                admin.database().ref('devices').child(uid).child(args[0]).set(true);
            }
        }
        else if (['gpsdig'].includes(args[0])) {
            admin.database().ref('gpsdig_tried').child(uid).set(true);
            if (args.length < 3) {
                message(uid, '~ spinning up device ' + args[0].toUpperCase() + '...');
                message(uid, '!! device is privileged! please supply a username and password to enable');
                message(uid, '!! failed to enable system ' + args[0].toUpperCase());
            } else if (!spingroup.includes(args[1])) {
                message(uid, '~ spinning up device ' + args[0].toUpperCase() + ' as user ' + args[1].toUpperCase() + '...');
                message(uid, "!! device is privileged! user must be a member of group 'splinders'");
                message(uid, '!! failed to enable system ' + args[0].toUpperCase());
            } else if (args[1] !== 'alfonsop' || args[2] !== password) {
                message(uid, '~ spinning up device ' + args[0].toUpperCase() + ' as user ' + args[1].toUpperCase() + '...');
                message(uid, "!! device is privileged! invalid password for that user");
                message(uid, '!! failed to enable system ' + args[0].toUpperCase());
            } else {
                message(uid, '~ spinning up device ' + args[0].toUpperCase() + ' as user ' + args[1].toUpperCase() + '...');
                message(uid, '~ ' + args[0].toUpperCase() + ' system enabled');
                admin.database().ref('devices').child(uid).child(args[0]).set(true);
            }
        } else {
            message(uid, '!! unknown device');
        }
        resolve();
    });
}

function command_weave(uid, args) {
    return new Promise((resolve, reject) => {
        var datweave_ref = admin.database().ref('devices').child(uid).child('datweave');
        datweave_ref.once('value', snapshot => {
            if (!snapshot.val()) {
                message(uid, '!! dependency DATWEAVE is offline, enable and retry');
                resolve();
            } else {
                if (args.length === 0) {
                    message(uid, '!! missing argument');
                    resolve();
                    return;
                }
                var drive_ref = admin.database().ref('drive').child(uid);
                drive_ref.once('value', drive_snapshot => {
                    var dir_ref = admin.database().ref('directory').child(uid);
                    dir_ref.once('value', dir_snapshot => {
                        var struct_ref = admin.database().ref('structure').child(drive_snapshot.val()).child('/' + dir_snapshot.val());
                        struct_ref.once('value', struct_snapshot => {
                            var results = weave_get(struct_snapshot, args[0]);
                            if (results.length === 0)
                                message(uid, '~ no results found');
                            for (var i = 0; i < results.length; i++) {
                                var path = ((results[i].ref.parent.parent.toString() + '/').replace(/^.+?structure\/.\//, '') + '/' + results[i].child('name').val()).replace('//', '/');
                                message(uid, '~ result found in file ' + path + ':');
                                messages(uid, results[i].child('content').val());
                                if (i !== results.length - 1)
                                    message(uid, '');
                            }
                            resolve();
                        });
                    });
                });
            }
        });
    });
}

function weave_get(snapshot, keyword) {
    var results = [];
    if (snapshot.hasChildren()) {
        snapshot.forEach(child_snapshot => {
            if (child_snapshot.key === '!files')
                child_snapshot.forEach(file_snapshot => {
                    if (!file_snapshot.hasChild('content'))
                        return;
                    var found = false;
                    var lines = file_snapshot.child('content').val();
                    for (var i = 0; i < lines.length; i++)
                        found = found || lines[i].toLowerCase().match(keyword);
                    if (found)
                        results.push(file_snapshot);
                });
            else
                results.push(...weave_get(child_snapshot, keyword))
        });
    }
    return results;
}

function command_digger(uid, args) {
    return new Promise((resolve, reject) => {
        var gpsdig_ref = admin.database().ref('devices').child(uid).child('gpsdig');
        gpsdig_ref.once('value', snapshot => {
            if (!snapshot.val()) {
                message(uid, '!! dependency GPSDIG is offline, enable and retry');
                resolve();
                return;
            }
            if (args.length === 0) {
                message(uid, '!! missing argument');
                resolve();
                return;
            }
            var drive_ref = admin.database().ref('drive').child(uid);
            drive_ref.once('value', drive_snapshot => {
                if (drive_snapshot.val() !== 'p') {
                    message(uid, '!! no .dig files found in current directory, aborting');
                    resolve();
                    return;
                }
                var gps_ref = admin.database().ref('gps').child(uid);
                gps_ref.once('value', drive_snapshot => {

                    var x = drive_snapshot.val().x;
                    var y = drive_snapshot.val().y;

                    if (args[0] === 'view') {
                        message(uid, '~ current dig site:')
                        showtile(uid, x, y);
                    } else if (['north', 'east', 'south', 'west'].includes(args[0])) {
                        message(uid, '~ moving dig site ' + args[0] + '...')
                        var new_x = x + { 'north': 0, 'east': 1, 'south': 0, 'west': -1 }[args[0]]
                        var new_y = y + { 'north': 1, 'east': 0, 'south': -1, 'west': 0 }[args[0]]
                        if (tileExists(new_x, new_y) || new_x === 0 && new_y === 0 || new_x === start_x && new_y === start_y) {
                            gps_ref.set({ 'x': new_x, 'y': new_y });
                            message(uid, '~ new dig site:')
                            showtile(uid, new_x, new_y);
                        } else {
                            message(uid, '!! dig site is tainted! cannot move ' + args[0] + '. current dig site unchanged.')
                        }
                    } else {
                        message(uid, '!! received invalid argument')
                    }
                    resolve();
                });
            });
        });
    });
}

var cols = 21;
var rows = 9;
var symbols = ' .~^^^o'

var ringsize = 3;

function showtile(uid, x, y) {
    var tile = tileGen(x, y);
    if (x === 0 && y === 0) {
        for (var a = Math.floor(cols / 2) - ringsize; a < Math.ceil(cols / 2) + ringsize; a++)
            for (var b = Math.floor(rows / 2) - ringsize; b < Math.ceil(rows / 2) + ringsize; b++)
                tile[b] = replace(tile[b], a, 'X');
        for (a = Math.floor(cols / 2) - (ringsize - 1); a < Math.ceil(cols / 2) + (ringsize - 1); a++)
            for (b = Math.floor(rows / 2) - (ringsize - 1); b < Math.ceil(rows / 2) + (ringsize - 1); b++)
                tile[b] = replace(tile[b], a, ' ');
    }
    message(uid, '');
    messages(uid, tile.map(r => '  ' + r));
    message(uid, '');
    if (x === 0 && y === 0) {
        message(uid, '~ current dig site coordinates:');
        message(uid, '  ' + goal_n.toFixed(6) + ' N, ' + goal_e.toFixed(6) + ' E');
        message(uid, '~ parsolineal location uncovered!');
    } else {
        message(uid, '~ current dig site coordinates:');
        var e;
        var n;
        var x_e;
        var y_n;
        if (x === start_x && y === start_y) {
            e = start_e;
            n = start_n;
            x_e = e - goal_e;
            y_n = n - goal_n;
        } else {
            Math.seedrandom(x + '_' + y + '_coords');
            x_e = (x + Math.random() * 0.5 - 0.25) * step_e;
            y_n = (y + Math.random() * 0.5 - 0.25) * step_n;
            Math.seedrandom();
            e = goal_e + x_e;
            n = goal_n + y_n;
        }
        message(uid, '  ' + n.toFixed(6) + ' N, ' + e.toFixed(6) + ' E');
        message(uid, '~ nearest parsolineal location:');
        var km = Math.abs(x_e * km_e) + Math.abs(y_n * km_n);
        message(uid, '  ' + km.toFixed(1) + ' km');
    }
}

function replace(str, i, x) {
    return str.substr(0, i) + x + str.substr(i + x.length);
}

var exist_chance = 2 / 3;
var random_maze = 14;
function tileExists(x, y) {
    Math.seedrandom(x + '_' + y + '_exist_' + random_maze);
    var r = Math.random() <= exist_chance;
    Math.seedrandom();
    return r;
}

function tileGen(x, y) {
    Math.seedrandom(x + '_' + y + '_gen');
    var numbers = Array(cols).fill().map(() => Array(rows).fill(0));
    for (var n = 0; n < symbols.length - 2; n++) {
        var bitfield = bitField();
        for (var a = 0; a < cols; a++)
            for (var b = 0; b < rows; b++)
                numbers[a][b] += bitfield[a][b];
    }
    for (n = 0; n < getRandomInt(0, 5); n++)
        numbers[getRandomInt(0, cols - 1)][getRandomInt(0, rows - 1)] = symbols.length - 1;
    var result = Array(rows);
    for (b = rows - 1; b >= 0; b--) {
        var r = ''
        for (a = 0; a < cols; a++)
            r += symbols[numbers[a][b]];
        result[b] = r;
    }
    Math.seedrandom();
    return result;
}

function bitField() {
    var a = getRandomInt(0, cols - 1);
    var b = getRandomInt(0, rows - 1);
    var numbers = Array(cols).fill().map(() => Array(rows).fill(0));
    for (var i = 0; i < 99; i++) {
        numbers[a][b] = 1;
        if (Math.random() > 0.5)
            a = (a + (Math.random() > 0.5)) % cols;
        else
            b = (b + (Math.random() > 0.5)) % rows;
    }
    return numbers
}

function command_graph(uid, args) {
    return new Promise((resolve, reject) => {
        var termgraph_ref = admin.database().ref('devices').child(uid).child('termgraph');
        termgraph_ref.once('value', snapshot => {
            if (!snapshot.val()) {
                message(uid, '!! dependency TERMGRAPH is offline, enable and retry');
                resolve();
            } else {
                if (args.length === 0) {
                    message(uid, '!! missing argument');
                    resolve();
                    return;
                }
                var drive_ref = admin.database().ref('drive').child(uid);
                drive_ref.once('value', drive_snapshot => {
                    var dir_ref = admin.database().ref('directory').child(uid);
                    dir_ref.once('value', dir_snapshot => {
                        var struct_ref = admin.database().ref('structure').child(drive_snapshot.val()).child('/' + dir_snapshot.val());
                        struct_ref.once('value', struct_snapshot => {
                            var found = false;
                            if (struct_snapshot.hasChildren() && struct_snapshot.hasChild('!files'))
                                struct_snapshot.child('!files').forEach(file_snapshot => {
                                    if (file_snapshot.child('name').val() === args[0]) {
                                        found = true;
                                        if (file_snapshot.child('name').val().endsWith('.gph'))
                                            message(uid, '$$$ image ' + args[0].replace('.gph', '.png'));
                                        else
                                            message(uid, '!! graph command can only open .gph files');
                                    }
                                });
                            if (!found)
                                message(uid, '!! there is no file with that name');
                            resolve();
                        });
                    });
                });
            }
        });
    });
}

function command_break(uid, args) {
    return new Promise((resolve, reject) => {
        throw new Error('example error');
    });
}

function command_id(uid, args) {
    return new Promise((resolve, reject) => {
        message(uid, uid);
        resolve();
    });
}

function command_clear(uid, args) {
    return new Promise((resolve, reject) => {
        admin.database().ref('signout').child(uid).set(true);
        admin.auth().listUsers().then(result => {
            for (var i = 0; i < result.users.length; i++)
                admin.auth().deleteUser(result.users[i].uid);
            return 0;
        }).catch();
        drive_ref = admin.database().ref('/').set({ 'structure': structure });
    });
}

function command_release(uid, args) {
    return new Promise((resolve, reject) => {
        drive_ref = admin.database().ref('waiting').remove();
        drive_ref = admin.database().ref('disabled').remove();
        resolve();
    });
}

//////////////
/// OUTPUT ///
//////////////

var terminal_output = {
    initialise_user: [
        "                              ~~~~~~",
        "",
        "   This website is a puzzle, one of around 150 that were created",
        "   as part of a Dutch Scouting camp known as the 'Paranoia HIT'.",
        "  Along with the URL to this website, participants were provided",
        " with two pieces of information. Firstly, the goal of the puzzle:",
        "",
        "              Find the nearest parsolineal location.",
        "",
        "   The second piece of information will be revealed to you after",
        "       a certain stage is reached in the puzzle. Good luck!",
        "",
        "                              ~~~~~~",
        "",
        "~ SPLUP system enabled",
        "~ CONNMAN system enabled",
        "ACCESSING REMOTE SYSTEM TCHWRK_{{id}}",
        ".",
        ".",
        ".",
        ".",
        ".",
        ".",
        ".",
        ".",
        ".",
        ".",
        "!! ERR409: REMOTE ACCESS INHIBITED, SHUNTED TO STAGING DRIVE",
        "preparing to set environment to drive A ...",
        "!! WARNING: slow spooling detected",
        "",
        "////////////////////////////////",
        "/// NOW CONNECTED TO DRIVE A ///",
        "////////////////////////////////",
        "",
        "~ terminal enabled",
        "~ HELP system enabled (type 'help' to start)"
    ],
    status: [
        "ch@rl3m@gn3 v14.7 command terminal",
        "~ currently serviced by: MAINFRAME@TCHWRK",
        "~ number of spools: 97 available, {{busy}} busy",
        "~ drives installed: 17 (A...Q)",
        "~ system dependencies:",
        "  - SPLUP (on)",
        "  - CONNMAN (on)",
        "  - HELP (on)",
        "  - DRVMAN ({{drvman}})",
        "  - DATWEAVE ({{datweave}})",
        "  - TERMGRAPH ({{termgraph}})",
        "  - GPSDIG ({{gpsdig}})"
    ],
    help: [
        "~ standard commands: status, list, show, dir, enter, leave, shodrv, setdrv, despool, help",
        "~ use 'help (insert command name)' to get command help"
    ],
    help_dir: [
        "dir: show the current directory"
    ],
    help_enter: [
        "enter DIRNAME: enter the given directory"
    ],
    help_leave: [
        "leave: leave the current directory"
    ],
    help_shodrv: [
        "shodrv: show the current drive"
    ],
    help_setdrv: [
        "go to the given drive. some drives require a decryption key",
        "setdrv DRIVENAME",
        "setdrv DRIVENAME DECRYPTIONKEY",
    ],
    help_list: [
        "list: list the files and directories in the current directory"
    ],
    help_show: [
        "show FILE: show the given file"
    ],
    help_despool: [
        "despool: destroy the current session and surrender the machine state"
    ],
    help_help: [
        "use to get help on commands",
        "help: command overview",
        "help COMMAND: get help on the specified command"
    ],
    help_status: [
        "status: show system status"
    ],
    help_unknown: [
        "~ no help known for the given command"
    ],
    help_upspin: [
        "enable a system dependency. some devices require a username, and some also a password",
        "upspin SERVICE",
        "upspin SERVICE USERNAME",
        "upspin SERVICE USERNAME PASSWORD"
    ],
    help_weave: [
        "weave TERM: search through all files in the current directory (including subdirectories) for the given term",
    ],
    help_digger: [
        "examine gps data from .dig files",
        "digger view: show the view at the current dig site",
        "digger north: move the dig site north",
        "digger east: move the dig site east",
        "digger south: move the dig site south",
        "digger west: move the dig site west",
    ],
    help_graph: [
        "graph FILE: plot the given graphical file"
    ],
    signout_confirm: [
        "WARNING! You are attempting to despool. The current machine state will be lost. Run 'despool confirm' to confirm."
    ],
    signout: [
        "COMMENCING DESPOOL --- DEVOLVING SYSTEM",
    ],
    unknown: [
        "!! received invalid command"
    ]
}
