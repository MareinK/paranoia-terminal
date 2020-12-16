var app = angular.module("terminal", ["firebase"])

app.controller("TerminalCtrl", ($scope, $window, $sce, $firebaseAuth, $firebaseArray) => {
    var auth = $firebaseAuth();
    $scope.waiting = true;
    $scope.dots_state = 0;
    $scope.dots = ".....";
    $scope.command = {
        value: "",
        history: 0,
    }; // nested values in object is a workaround for view not being updated correctly.

    var dotspeed = 1000;
    function updateDots() {
        $scope.dots_state = ($scope.dots_state + 1) % 5;
        $scope.dots = "." + Array($scope.dots_state + 1).join(".");
        $scope.$apply();
        setTimeout(updateDots, dotspeed);
    }
    setTimeout(updateDots, dotspeed);

    auth.$onAuthStateChanged((user) => {
        $scope.user = user;
        if (!user) {
            $scope.waiting = true;
            auth.$signInAnonymously();
            $scope.commands = [];
            $scope.messages = [];
        } else {
            var waiting_ref = firebase.database().ref().child("waiting").child(user.uid);
            waiting_ref.set(false);
            waiting_ref.on("value", (snapshot, prevChildKey) => {
                $scope.waiting = snapshot.val();
            });
            var disabled_ref = firebase.database().ref().child("disabled").child(user.uid);
            disabled_ref.on("value", (snapshot, prevChildKey) => {
                $scope.disabled = snapshot.val();
            });
            var logout_ref = firebase.database().ref().child("signout").child(user.uid);
            logout_ref.on("value", (snapshot, prevChildKey) => {
                if (snapshot.val())
                    setTimeout(() => { $window.location.reload() }, 2000);
            });
            var commands_ref = firebase.database().ref().child("commands").child(user.uid);
            var messages_ref = firebase.database().ref().child("messages").child(user.uid);
            $scope.commands = $firebaseArray(commands_ref);
            $scope.messages = $firebaseArray(messages_ref);

            $scope.commands.$watch(event => {
                $scope.commands_history = $scope.commands
                    .map(c => c.$value)
                    .filter((item, pos, arr) => {
                        return pos === 0 || item !== arr[pos - 1];
                    });
            })
        }
    });

    $scope.sendCommand = function () {
        if ($scope.command.value.replace(/ /g, '').length > 0) {
            var waiting_ref = firebase.database().ref().child("waiting").child($scope.user.uid);
            waiting_ref.set(true);
            firebase.functions().httpsCallable('sendCommand')($scope.command.value);
            $scope.command.value = "";
            $scope.command.history = 0;
        }
    };

    $scope.process = (message) => {
        if (message.startsWith('··$$$ image'))
            return $sce.trustAsHtml('<img src="' + message.slice('··$$$ image'.length) + '">');
        else
            return $sce.trustAsHtml(message.replace(/·/g, '&nbsp;'));
        // return $sce.trustAsHtml(message.replace(/^ +/g, spaces => '&nbsp;'.repeat(spaces.length)));
        // return $sce.trustAsHtml(message);
    };

    $scope.page_key = (event) => {
        // ignore Ctrl and Ctrl+Cand equivalent for Mac, so user can copy
        if (event.keyCode == 17 || event.keyCode == 91 || event.keyCode == 224 || // Ctrl / Command Chrome / Command Firefox
            (event.ctrlKey || event.metaKey) && event.keyCode == 67) // Ctrl+X / Command+C
            return;
        var el = document.getElementById("input");
        if (el) // might be hidden when waiting/disabled
            el.focus();
    };

    $scope.input_key = (event) => {
        switch (event.keyCode) {
            case 38: // up arrow
                $scope.command.history = Math.min($scope.commands_history.length, $scope.command.history + 1);
                if ($scope.commands_history.length > 0)
                    $scope.updateCommand();
                event.preventDefault();
                break
            case 40: // down arrow
                $scope.command.history = Math.max(0, $scope.command.history - 1);
                if ($scope.command.history == 0)
                    $scope.command.value = "";
                else
                    $scope.updateCommand();
                event.preventDefault();
                break
        }
    };

    $scope.updateCommand = () => {
        $scope.command.value = $scope.commands_history[$scope.commands_history.length - $scope.command.history];
    };
});

app.directive('ngScrollBottom', ['$timeout', ($timeout) => {
    return {
        scope: {
            ngScrollBottom: "="
        },
        link: ($scope, $element) => {
            $scope.$watchCollection('ngScrollBottom', (newValue) => {
                $timeout(() => {
                    $element[0].scrollTop = $element[0].scrollHeight;
                }, 0);
            });
        }
    }
}]);

app.directive('ngFocusOn', ($timeout) => {
    return {
        restrict: 'A',
        link: ($scope, $element, $attr) => {
            $scope.$watch($attr.ngFocusOn, (_focusVal) => {
                $timeout(() => {
                    _focusVal ? $element[0].focus() :
                        $element[0].blur();
                });
            });
        }
    }
})
