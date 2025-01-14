/*
 * Copyright 2018 Comcast Cable Communications Management, LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

angular.module('controller.zones', [])
    .controller('ZonesController', function ($scope, $http, $location, $log, recordsService, zonesService, profileService,
                                             groupsService, utilityService, $timeout, pagingService) {

    $scope.alerts = [];
    $scope.zonesLoaded = false;
    $scope.allZonesLoaded = false;
    $scope.hasZones = false; // Re-assigned each time zones are fetched without a query
    $scope.allGroups = [];
    $scope.ignoreAccess = false;
    $scope.allZonesAccess = function () {
        $scope.ignoreAccess = true;
    }

    $scope.myZonesAccess = function () {
        $scope.ignoreAccess = false;
    }

    $scope.query = "";

    $scope.keyAlgorithms = ['HMAC-MD5', 'HMAC-SHA1', 'HMAC-SHA224', 'HMAC-SHA256', 'HMAC-SHA384', 'HMAC-SHA512'];

    // Paging status for zone sets
    var zonesPaging = pagingService.getNewPagingParams(100);
    var allZonesPaging = pagingService.getNewPagingParams(100);

    profileService.getAuthenticatedUserData().then(function (results) {
        if (results.data) {
            $scope.profile = results.data;
            $scope.profile.active = 'zones';
        }
    }, function () {
        $scope.profile = $scope.profile || {};
        $scope.profile.active = 'zones';
    });

    $scope.resetCurrentZone = function () {
        $scope.currentZone = {};

        if($scope.myGroups && $scope.myGroups.length) {
            $scope.currentZone.adminGroupId = $scope.myGroups[0].id;
        }

        $scope.currentZone.connection = {};
        $scope.currentZone.transferConnection = {};
    };

    groupsService.getGroups(true, "").then(function (results) {
        if (results.data) {
            // Get all groups where the group members include the current user
            $scope.myGroups = results.data.groups.filter(grp => grp.members.findIndex(mem => mem.id === $scope.profile.id) >= 0);
            $scope.myGroupIds = $scope.myGroups.map(grp => grp.id);
            $scope.allGroups = results.data.groups;
        }
        $scope.resetCurrentZone();
    });

    zonesService.getBackendIds().then(function (results) {
        if (results.data) {
            $scope.backendIds = results.data;
        }
    });

    $scope.canAccessGroup = function(groupId) {
         return $scope.myGroupIds !== "undefined" &&  $scope.myGroupIds.indexOf(groupId) > -1;
    };

    $scope.canAccessZone = function(accessLevel) {
        if (accessLevel == 'Read' || accessLevel == 'Delete') {
            return true;
        } else {
            return false;
        }
    };

    $.zoneAutocompleteSearch = function() {
        // Autocomplete for zone search
        $(".zone-search-text").autocomplete({
          source: function( request, response ) {
            $.ajax({
              url: "/api/zones?maxItems=100",
              dataType: "json",
              data: {nameFilter: request.term, ignoreAccess: $scope.ignoreAccess},
              success: function(data) {
                  const search =  JSON.parse(JSON.stringify(data));
                  response($.map(search.zones, function(zone) {
                  return {value: zone.name, label: zone.name}
                  }))
              }
            });
          },
          minLength: 1,
          select: function (event, ui) {
              $scope.query = ui.item.value;
              $(".zone-search-text").val(ui.item.value);
              return false;
            },
          open: function() {
            $(this).removeClass("ui-corner-all").addClass("ui-corner-top");
          },
          close: function() {
            $(this).removeClass("ui-corner-top").addClass("ui-corner-all");
          }
        });
    };

    // Should be the default autocomplete search result option
    $.zoneAutocompleteSearch();

    $('.isGroupSearch').change(function() {
        if(this.checked) {
            // Autocomplete for search by admin group
            $(".zone-search-text").autocomplete({
              source: function( request, response ) {
                $.ajax({
                  url: "/api/groups?maxItems=100&abridged=true",
                  dataType: "json",
                  data: {groupNameFilter: request.term, ignoreAccess: $scope.ignoreAccess},
                  success: function(data) {
                      const search =  JSON.parse(JSON.stringify(data));
                      response($.map(search.groups, function(group) {
                      return {value: group.name, label: group.name}
                      }))
                  }
                });
              },
              minLength: 1,
              select: function (event, ui) {
                  $scope.query = ui.item.value;
                  $(".zone-search-text").val(ui.item.value);
                  return false;
                },
              open: function() {
                $(this).removeClass("ui-corner-all").addClass("ui-corner-top");
              },
              close: function() {
                $(this).removeClass("ui-corner-top").addClass("ui-corner-all");
              }
            });
        } else {
            $.zoneAutocompleteSearch();
        }
    });

    // Autocomplete text-highlight
    $.ui.autocomplete.prototype._renderItem = function(ul, item) {
            let txt = String(item.label).replace(new RegExp(this.term, "gi"),"<b>$&</b>");
            return $("<li></li>")
                  .data("ui-autocomplete-item", item.value)
                  .append("<div>" + txt + "</div>")
                  .appendTo(ul);
    };

    /* Refreshes zone data set and then re-displays */
    $scope.refreshZones = function () {
        zonesPaging = pagingService.resetPaging(zonesPaging);
        allZonesPaging = pagingService.resetPaging(allZonesPaging);

        zonesService
            .getZones(zonesPaging.maxItems, undefined, $scope.query, $scope.searchByAdminGroup)
            .then(function (response) {
                $log.log('zonesService::getZones-success (' + response.data.zones.length + ' zones)');
                zonesPaging.next = response.data.nextId;
                updateZoneDisplay(response.data.zones);
                if (!$scope.query.length) {
                    $scope.hasZones = response.data.zones.length > 0;
                }
            })
            .catch(function (error) {
                handleError(error, 'zonesService::getZones-failure');
            });

        zonesService
            .getZones(zonesPaging.maxItems, undefined, $scope.query, $scope.searchByAdminGroup, true)
            .then(function (response) {
                $log.log('zonesService::getZones-success (' + response.data.zones.length + ' zones)');
                allZonesPaging.next = response.data.nextId;
                updateAllZonesDisplay(response.data.zones);
            })
            .catch(function (error) {
                handleError(error, 'zonesService::getZones-failure');
            });
    };

    function updateZoneDisplay (zones) {
        $scope.zones = zones;
        $scope.myZoneIds = zones.map(function(zone) {return zone['id']});
        $scope.zonesLoaded = true;
        $log.log("Displaying my zones: ", $scope.zones);
        if($scope.zones.length > 0) {
            $("td.dataTables_empty").hide();
        } else {
            $("td.dataTables_empty").show();
        }
    }

    function updateAllZonesDisplay (zones) {
        $scope.allZones = zones;
        $scope.allZonesLoaded = true;
        $log.log("Displaying all zones: ", $scope.allZones);
        if($scope.allZones.length > 0) {
            $("td.dataTables_empty").hide();
        } else {
            $("td.dataTables_empty").show();
        }
    }

    /* Set total number of zones  */

    $scope.addZoneConnection = function () {
        if ($scope.processing) {
            $log.log('zoneConnection::processing is true; exiting');
            return;
        }

        //flag to prevent multiple clicks until previous promise has resolved.
        $scope.processing = true;
        $scope.currentZone = zonesService.checkBackendId($scope.currentZone);

        zonesService.sendZone($scope.currentZone)
            .then(function () {
                $timeout($scope.refreshZones(), 1000);
                $("#zone_connection_modal").modal("hide");
                $scope.processing = false;
            })
            .catch(function (error){
                $("#zone_connection_modal").modal("hide");
                $scope.zoneError = true;
                handleError(error, 'zonesService::sendZone-failure');
                $scope.processing = false;
            });
    };

    function handleError(error, type) {
        $scope.zoneError = true;
        var alert = utilityService.failure(error, type);
        $scope.alerts.push(alert);

        if(error.data !== undefined && error.data.errors !== undefined) {
            var errors = error.data.errors;
            for(i in errors) {
                $scope.alerts.push({type: "danger", content:errors[i]});
            }
        }
    }

    /*
     * Zone set paging
     */
     $scope.getZonesPageNumber = function(tab) {
         switch(tab) {
             case 'myZones':
                 return pagingService.getPanelTitle(zonesPaging);
             case 'allZones':
                 return pagingService.getPanelTitle(allZonesPaging);
         }
     };

    $scope.prevPageEnabled = function(tab) {
        switch(tab) {
            case 'myZones':
                return pagingService.prevPageEnabled(zonesPaging);
            case 'allZones':
                return pagingService.prevPageEnabled(allZonesPaging);
        }
    };

    $scope.nextPageEnabled = function(tab) {
        switch(tab) {
            case 'myZones':
                return pagingService.nextPageEnabled(zonesPaging);
            case 'allZones':
                return pagingService.nextPageEnabled(allZonesPaging);
        }
    };

    $scope.prevPageMyZones = function() {
        var startFrom = pagingService.getPrevStartFrom(zonesPaging);
        return zonesService
            .getZones(zonesPaging.maxItems, startFrom, $scope.query, $scope.searchByAdminGroup, false)
            .then(function(response) {
                zonesPaging = pagingService.prevPageUpdate(response.data.nextId, zonesPaging);
                updateZoneDisplay(response.data.zones);
            })
            .catch(function (error) {
                handleError(error,'zonesService::prevPage-failure');
            });
    }

    $scope.prevPageAllZones = function() {
        var startFrom = pagingService.getPrevStartFrom(allZonesPaging);
        return zonesService
            .getZones(allZonesPaging.maxItems, startFrom, $scope.query, $scope.searchByAdminGroup, true)
            .then(function(response) {
                allZonesPaging = pagingService.prevPageUpdate(response.data.nextId, allZonesPaging);
                updateAllZonesDisplay(response.data.zones);
            })
            .catch(function (error) {
                handleError(error,'zonesService::prevPage-failure');
            });
    }

    $scope.nextPageMyZones = function () {
        return zonesService
            .getZones(zonesPaging.maxItems, zonesPaging.next, $scope.query, $scope.searchByAdminGroup, false)
            .then(function(response) {
                var zoneSets = response.data.zones;
                zonesPaging = pagingService.nextPageUpdate(zoneSets, response.data.nextId, zonesPaging);

                if (zoneSets.length > 0) {
                    updateZoneDisplay(response.data.zones);
                }
            })
            .catch(function (error) {
               handleError(error,'zonesService::nextPage-failure')
            });
    };

    $scope.nextPageAllZones = function () {
        return zonesService
            .getZones(allZonesPaging.maxItems, allZonesPaging.next, $scope.query, $scope.searchByAdminGroup, true)
            .then(function(response) {
                var zoneSets = response.data.zones;
                allZonesPaging = pagingService.nextPageUpdate(zoneSets, response.data.nextId, allZonesPaging);

                if (zoneSets.length > 0) {
                    updateAllZonesDisplay(response.data.zones);
                }
            })
            .catch(function (error) {
               handleError(error,'zonesService::nextPage-failure')
            });
    };

    $timeout($scope.refreshZones, 0);
});
