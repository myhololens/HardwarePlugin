/**
 * Created by dominik on 12.12.16.
 */
function enableSettingsChange() {
    var status = document.getElementById("github_organization").disabled;
    {
        if (status === false) {
            document.getElementById("github_organization").disabled = true;
            document.getElementById("github_token_public").disabled = true;
            document.getElementById("github_token").disabled = true;
            document.getElementById("default-github-team").disabled = true;
        }
        else {
            document.getElementById("github_organization").disabled = false;
            document.getElementById("github_token_public").disabled = false;
            document.getElementById("github_token").disabled = false;
            document.getElementById("default-github-team").disabled = false;
        }
    }
}

function sendDataToServer(url)
{
    var git_config = {};

    if (AJS.$("#github_token").val() !== '')
    {
        git_config.githubToken = AJS.$("#github_token").val();
    }

    git_config.githubTokenPublic = AJS.$("#github_token_public").val();
    git_config.githubOrganization = AJS.$("#github_organization").val();
    git_config.defaultGithubTeam = AJS.$("#default-github-team").auiSelect2("val")

    AJS.$.ajax({
        url: url + "/rest/admin-helper/1.0/config/saveGithubConfig",
        type: "PUT",
        contentType: "application/json",
        data: JSON.stringify(git_config),
        processData: false,
        success: function () {
            AJS.messages.success({
                title: "Success!",
                body: "Github Settings were successfully saved!"
            });
        },
        error: function (error) {
            AJS.messages.error({
                title: "Error!",
                body: error.responseText
            });
            AJS.$(".loadingDiv").hide();
        }
    });
}

function  checkPublicTokenAndOrganization(url) {

    if (AJS.$("#github_token").val() !== '')
    {
        var new_private_token = AJS.$("#github_token").val();
        var new_organization = AJS.$("#github_organization").val();

        var res = AJS.$.ajax({
            url: "https://api.github.com/orgs/"+ new_organization +"/teams?access_token=" + new_private_token,
            type:"GET"
        });

        AJS.$.when(res)
            .done(function () {
                sendDataToServer(url)
            })
            .fail(function(error)
            {
                console.log(error.status);
                if(error.status == 401) {
                    AJS.messages.error({
                        title: "Error: " + error.status,
                        body: "Authentication Failed, check your private Token!"
                    })
                }
                if(error.status == 404) {
                    AJS.messages.error({
                        title: "Error: "+ error.status,
                        body: "The given Organization was not found!"
                    })
                }
            });
    }
    else
    {
        var settings = {};
        settings.githubOrganization = AJS.$("#github_organization").val();

        var res = AJS.$.ajax({
            url: url + "/rest/admin-helper/1.0/config/checkSettings",
            type: "PUT",
            async: false,
            contentType: "application/json",
            data: JSON.stringify(settings)
        });

        AJS.$.when(res)
            .done(function () {
                sendDataToServer(url)
            })
            .fail(function (error) {
                AJS.messages.error({
                    title:"Error",
                    body: error.responseText
                })
            })
    }
}

function redirectToDownload()
{
    var checked = document.getElementById("enable_full_download").checked;
    window.open(baseUrl+"/plugins/servlet/admin_helper/download_backup?config=true&hardware="+checked,"_self");
}

function redirectToUpload()
{
    window.open(baseUrl+"/plugins/servlet/admin_helper/upload_backup","_self");
}

function initGroupUserSearchField(baseUrl)
{
    AJS.$("#hardware-permission").auiSelect2({
        placeholder: "Search for users and groups",
        minimumInputLength: 0,
        tags: true,
        tokenSeparators: [",", " "],
        ajax: {
            url: baseUrl + "/rest/api/2/groupuserpicker",
            dataType: "json",
            data: function (term, page) {
                return {query: term};
            },
            results: function (data, page) {
                var select2data = [];
                for (var i = 0; i < data.groups.groups.length; i++) {
                    select2data.push({
                        id: "groups-" + data.groups.groups[i].name,
                        text: data.groups.groups[i].name
                    });
                }
                for (var i = 0; i < data.users.users.length; i++) {
                    select2data.push({
                        id: "users-" + data.users.users[i].name,
                        text: data.users.users[i].name
                    });
                }
                return {results: select2data};
            }
        },
        initSelection: function (elements, callback) {
            var data = [];
            var array = elements.val().split(",");
            for (var i = 0; i < array.length; i++) {
                data.push({id: array[i], text: array[i].replace(/^users-/i, "").replace(/^groups-/i, "")});
            }
            callback(data);
        }
    });

    AJS.$("#save-hardware-premission").click(function() {
        formulateReadonlyJSONAndSendToServer(baseUrl);
    });

    AJS.$("#clear-readonly-lists").click(function () {
        clearAllReadOnlyLists(baseUrl);
    });
}

function initHdwReadOnlyUsersAndGroups(baseUrl)
{
    AJS.$.ajax({
        url: baseUrl + "/rest/admin-helper/latest/hardware/getReadOnlyUsersAndGroups",
        type: "GET",
        success: function (config) {
            var approved = [];
            if (config.readOnlyGroups) {
                for (var i = 0; i < config.readOnlyGroups.length; i++) {
                    approved.push({id: "groups-" + config.readOnlyGroups[i], text: config.readOnlyGroups[i]});
                }
            }

            if (config.readOnlyUsers) {
                for (var i = 0; i < config.readOnlyUsers.length; i++) {
                    approved.push({id: "users-" + config.readOnlyUsers[i], text: config.readOnlyUsers[i]});
                }
            }
            console.log(approved[0]);
            AJS.$("#hardware-permission").auiSelect2("data", approved);
        },
        error : function () {
            AJS.messages.error(
                {
                    title:"Error!",
                    body:"There was an error loading ReadOnly Data!"
                })
        }
    })
}

function formulateReadonlyJSONAndSendToServer(baseUrl)
{
    var usersAndGroups = AJS.$("#hardware-permission").auiSelect2("val");
    var readOnlyUsers = [];
    var readOnlyGroups = [];
    for (var i = 0; i < usersAndGroups.length; i++) {
        if (usersAndGroups[i].match("^users-")) {
            readOnlyUsers.push(usersAndGroups[i].split("users-")[1]);
        } else if (usersAndGroups[i].match("^groups-")) {
            readOnlyGroups.push(usersAndGroups[i].split("groups-")[1]);
        }
    }

    var config = {};
    config.readOnlyUsers = readOnlyUsers;
    config.readOnlyGroups = readOnlyGroups;

    AJS.$.ajax({
        url: baseUrl + "/rest/admin-helper/latest/hardware/saveReadOnlyUsersAndGroups",
        type:"PUT",
        contentType: "application/json",
        data: JSON.stringify(config),
        dateType: "json",
        success: function () {
            AJS.messages.success({
                title:"Success",
                body:"ReadOnly Users and Groups were Successfully saved!"
            });
            //location.reload(true);
        },
        error: function (err) {
            AJS.messages.error({
                title:"Error",
                body:"There was an error processing your data <br>"+ err.responseText
            })
        }

    })
}

function clearAllReadOnlyLists(baseUrl) {
    AJS.$.ajax({
        url: baseUrl + "/rest/admin-helper/latest/hardware/resetReadonlyUsersAndGroups",
        type: "POST",
        success: function () {
            AJS.messages.success({
                title:"Success",
                body:"Reset was successful!"
            });
            //location.reload(true);
        },
        error: function (err) {
            AJS.$.message.error({
                title:"Error!",
                body:"There was an error processing your data <br>" + err.responseText
            })
        }
    })
}
