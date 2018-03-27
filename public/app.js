var app = angular.module("terminal", ["firebase"])

app.controller("TerminalCtrl", ($scope, $window, $sce, $firebaseAuth, $firebaseArray) => {
    var auth = $firebaseAuth();
    $scope.waiting = true;
    $scope.dots_state = 0;
    $scope.dots = ".....";

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
            $scope.messages = [];
        } else {
            var waiting_ref = firebase.database().ref().child("waiting").child(user.uid);
            waiting_ref.on("value", (snapshot, prevChildKey) => {
                $scope.waiting = snapshot.val();
            });
            var disabled_ref = firebase.database().ref().child("disabled_").child(user.uid);
            disabled_ref.on("value", (snapshot, prevChildKey) => {
                $scope.disabled = snapshot.val();
            });
            var logout_ref = firebase.database().ref().child("signout").child(user.uid);
            logout_ref.on("value", (snapshot, prevChildKey) => {
                if (snapshot.val())
                    setTimeout(() => { $window.location.reload() }, 2000);
            });
            var messages_ref = firebase.database().ref().child("messages").child(user.uid);
            $scope.messages = $firebaseArray(messages_ref);
        }
    });

    $scope.sendCommand = function (message) {
        var waiting_ref = firebase.database().ref().child("waiting").child($scope.user.uid);
        waiting_ref.set(true);
        firebase.functions().httpsCallable('sendCommand')(message);
    };

    $scope.process = (message) => {
        if (message.startsWith('  $$$ image'))
            return $sce.trustAsHtml('<img src="' + message.split(' ')[4] + '" style="max-width: 100%">');
        else
            return $sce.trustAsHtml(message.replace(/ /g, '&nbsp;'));
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
