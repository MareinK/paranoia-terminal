const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp(functions.config().firebase);

/////////////////
/// MACHINERY ///
/////////////////

exports.initialiseUser = functions.auth.user().onCreate((event) => {
    var uid = event.data.uid;
    admin.database().ref('drive').child(uid).set('A');
    admin.database().ref('directory').child(uid).set('');
    admin.database().ref('waiting').child(uid).set(true);

    var fmt = { id: getRandomInt(15, 95) };
    messages(uid, terminal_output.initialise_user, fmt);

    admin.database().ref('waiting').child(uid).set(false);

    return 0;
});

exports.sendCommand = functions.https.onCall((data, context) => {
    var uid = context.auth.uid;
    admin.database().ref('messages').child(uid).push('$ ' + data);

    var parts = data.toLowerCase().split(/\s+/);
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
            func = command_signout;
            break;
        case "help":
            func = command_help;
            break;
        case "upspin":
            func = command_upspin;
            break;
        default:
            func = command_unknown;
            break;
    }
    func(uid, args).then(() => {
        admin.database().ref('waiting').child(uid).set(false);
        return 0;
    }).catch(() => { });
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

function command_help(uid, args) {
    return new Promise((resolve, reject) => {
        if (args.length === 0) {
            var deps_ref = admin.database().ref('dependencies').child(uid);
            deps_ref.once('value', (snapshot) => {
                var val = snapshot.val();
                var fmt = {
                    busy: getRandomInt(5, 15),
                    drvman: val && val.drvman ? 'on' : 'off',
                    datweave: val && val.datweave ? 'on' : 'off',
                    termgraph: val && val.termgraph ? 'on' : 'off',
                    gpsdig: val && val.gpsdig ? 'on' : 'off'
                };
                messages(uid, terminal_output.help, fmt);
                resolve();
            });
        } else {
            switch (args[0]) {
                case 'dir':
                    messages(uid, terminal_output.help_dir)
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
                default:
                    message(uid, terminal_output.help_unknown)
                    break;
            }
            resolve();
        }
    });
}

function command_signout(uid, args) {
    return new Promise((resolve, reject) => {
        if (args && args[0] === 'confirm') {
            messages(uid, terminal_output.signout);
            admin.auth().deleteUser(uid);
            admin.database().ref('signout').child(uid).set(true);
            resolve();
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
        dir_ref.once('value', (snapshot) => {
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
        drive_ref.once('value', (drive_snapshot) => {
            var dir_ref = admin.database().ref('directory').child(uid);
            dir_ref.once('value', (dir_snapshot) => {
                var struct_ref = admin.database().ref('structure').child(drive_snapshot.val()).child('/' + dir_snapshot.val());
                struct_ref.once('value', (struct_snapshot) => {
                    if (struct_snapshot.hasChild(args[0])) {
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
        dir_ref.once('value', (dir_snapshot) => {
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
        var drive_ref = admin.database().ref('drive').child(uid);
        drive_ref.once('value', (snapshot) => {
            message(uid, snapshot.val());
            resolve();
        });
    });
}

var open_drives = ['A', 'B', 'D', 'K'];
var pass_drives = ['']

function command_setdrv(uid, args) {
    return new Promise((resolve, reject) => {
        if (args.length === 0) {
            message(uid, '!! missing argument');
            resolve();
            return;
        }
        var drvman_ref = admin.database().ref('dependencies').child(uid).child('drvman');
        drvman_ref.once('value', (snapshot) => {
            if (!snapshot.val()) {
                message(uid, '!! dependency DRVMAN is offline, enable and retry');
                resolve();
                return;
            }
        });
    });
}

function command_list(uid, args) {
    return new Promise((resolve, reject) => {
        var drive_ref = admin.database().ref('drive').child(uid);
        drive_ref.once('value', (drive_snapshot) => {
            var dir_ref = admin.database().ref('directory').child(uid);
            dir_ref.once('value', (dir_snapshot) => {
                var struct_ref = admin.database().ref('structure').child(drive_snapshot.val()).child('/' + dir_snapshot.val());
                struct_ref.once('value', (struct_snapshot) => {
                    if (struct_snapshot.hasChildren()) {
                        struct_snapshot.forEach((child_snapshot) => {
                            if (child_snapshot.key === '!files')
                                child_snapshot.forEach((file_snapshot) => {
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
        drive_ref.once('value', (drive_snapshot) => {
            var dir_ref = admin.database().ref('directory').child(uid);
            dir_ref.once('value', (dir_snapshot) => {
                var struct_ref = admin.database().ref('structure').child(drive_snapshot.val()).child('/' + dir_snapshot.val());
                struct_ref.once('value', (struct_snapshot) => {
                    var found = false;
                    if (struct_snapshot.hasChildren() && struct_snapshot.hasChild('!files'))
                        struct_snapshot.child('!files').forEach((file_snapshot) => {
                            if (file_snapshot.child('name').val() === args[0]) {
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

function command_upspin(uid, args) {
    return new Promise((resolve, reject) => {

        resolve();
    });
}

//////////////
/// OUTPUT ///
//////////////

var terminal_output = {
    initialise_user: [
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
        "////////////////////////////////////////",
        "/// NOW CONNECTED TO STAGING DRIVE A ///",
        "////////////////////////////////////////",
        "",
        "~ terminal enabled",
        "~ HELP system enabled"
    ],
    help: [
        "ch@rl3m@gn3 v14.7 command terminal",
        "~ currently serviced by: MAINFRAME@TCHWRK",
        "~ number of spools: 97 available, {{busy}} busy",
        "~ drives installed: 17",
        "~ system dependencies:",
        "  - SPLUP (on)",
        "  - CONNMAN (on)",
        "  - HELP (on)",
        "  - DRVMAN ({{drvman}})",
        "  - DATWEAVE ({{datweave}})",
        "  - TERMGRAPH ({{termgraph}})",
        "  - GPSDIG ({{gpsdig}})",
        "~ standard commands: dir, enter, leave, shodrv, setdrv, list, show, despool, help",
        "use 'help (insert command name)' to get command help"
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
        "setdrv DRIVENAME: go to the given drive"
    ],
    help_list: [
        "list: list the files and directories in the current directory"
    ],
    help_show: [
        "show FILE: show the given file"
    ],
    help_despool: [
        "destroy the current session and surrender the machine state"
    ],
    help_help: [
        "this"
    ],
    help_unknown: [
        "no help known for the given command"
    ],
    help_upspin: [
        "enable a system dependency. some services require a username, and some also a password",
        "upspin SERVICE",
        "upspin SERVICE USERNAME",
        "upspin SERVICE USERNAME PASSWORD"
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
