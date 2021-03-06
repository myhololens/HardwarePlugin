/*
 * Copyright 2014 Stephan Fellhofer
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

package org.catrobat.jira.adminhelper;

import com.atlassian.jira.component.ComponentAccessor;
import com.atlassian.jira.security.groups.GroupManager;
import com.atlassian.jira.user.util.UserManager;
import com.atlassian.sal.api.auth.LoginUriProvider;
import com.atlassian.sal.api.websudo.WebSudoManager;
import org.apache.xml.security.c14n.implementations.Canonicalizer11_OmitComments;
import org.catrobat.jira.adminhelper.activeobject.AdminHelperConfigService;
import com.atlassian.jira.user.ApplicationUser;
import org.catrobat.jira.adminhelper.activeobject.ReadOnlyHdwGroup;
import org.catrobat.jira.adminhelper.activeobject.ReadOnlyHdwGroupService;
import org.catrobat.jira.adminhelper.activeobject.ReadOnlyHdwUserService;
import org.catrobat.jira.adminhelper.helper.HardwarePremissionCondition;
import org.catrobat.jira.adminhelper.helper.PermissionCondition;


import javax.servlet.ServletException;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.net.URI;

import static com.google.common.base.Preconditions.checkElementIndex;
import static com.google.common.base.Preconditions.checkNotNull;

public abstract class HelperServlet extends HttpServlet {
    private final UserManager userManager;
    private final LoginUriProvider loginUriProvider;
    private final WebSudoManager webSudoManager;
    private final GroupManager groupManager;
    private final AdminHelperConfigService configurationService;
    private ReadOnlyHdwGroupService readOnlyHdwGroupService;
    private ReadOnlyHdwUserService readOnlyHdwUserService;
    private boolean isHdwServlet;

    public HelperServlet(final UserManager userManager, final LoginUriProvider loginUriProvider,
                         final WebSudoManager webSudoManager, final GroupManager groupManager,
                         final AdminHelperConfigService configurationService) {
        this.userManager = checkNotNull(userManager, "userManager");
        this.loginUriProvider = checkNotNull(loginUriProvider, "loginProvider");
        this.webSudoManager = checkNotNull(webSudoManager, "webSudoManager");
        this.groupManager = checkNotNull(groupManager);
        this.configurationService = checkNotNull(configurationService);
        this.readOnlyHdwUserService = null;
        this.readOnlyHdwGroupService = null;
        this.isHdwServlet = false;
    }

    @Override
    public void doGet(HttpServletRequest request, HttpServletResponse response) throws IOException, ServletException {
        if(isHdwServlet)
            checkHardwarePremission(response, request);
        else
            checkPermission(request, response);
    }

    @Override
    public void doPost(HttpServletRequest request, HttpServletResponse response) throws IOException, ServletException {
        checkPermission(request, response);
    }

    private void checkPermission(HttpServletRequest request, HttpServletResponse response) throws IOException, ServletException {
        PermissionCondition permissionCondition = new PermissionCondition(null, configurationService, userManager, groupManager);
        ApplicationUser currently_logged_in = ComponentAccessor.getJiraAuthenticationContext().getLoggedInUser();

        if (currently_logged_in.getUsername() == null) {
            redirectToLogin(request, response);
            return;
        } else if (!ComponentAccessor.getUserUtil().getJiraSystemAdministrators().contains(currently_logged_in)) {
            response.sendError(HttpServletResponse.SC_FORBIDDEN);
            return;
        } else if (!permissionCondition.isApproved(currently_logged_in.getUsername())) {
            response.sendError(HttpServletResponse.SC_FORBIDDEN);
            return;
        }
        if (!webSudoManager.canExecuteRequest(request)) {
            webSudoManager.enforceWebSudoProtection(request, response);
            return;
        }

        response.setContentType("text/html;charset=utf-8");
    }

    private void redirectToLogin(HttpServletRequest request, HttpServletResponse response) throws IOException {
        response.sendRedirect(loginUriProvider.getLoginUri(getUri(request)).toASCIIString());
    }

    private URI getUri(HttpServletRequest request) {
        StringBuffer builder = request.getRequestURL();
        if (request.getQueryString() != null) {
            builder.append("?");
            builder.append(request.getQueryString());
        }
        return URI.create(builder.toString());
    }

    private void checkHardwarePremission(HttpServletResponse response, HttpServletRequest request) throws IOException
    {
        System.out.println("------------Checking Hardware Premission --------------------");
        HardwarePremissionCondition hdwpremission = new HardwarePremissionCondition(null, userManager,
                readOnlyHdwGroupService, readOnlyHdwUserService, configurationService, groupManager);

        PermissionCondition permissionCondition = new PermissionCondition(null, configurationService, userManager, groupManager);

        ApplicationUser applicationUser = ComponentAccessor.getJiraAuthenticationContext().getLoggedInUser();
        if(applicationUser == null) {
            redirectToLogin(request, response);
        }
        else if(!permissionCondition.isApproved(applicationUser)) {
            if(!hdwpremission.approvedHardwareUser(applicationUser)) {
                response.sendError(HttpServletResponse.SC_FORBIDDEN);
            }
        }
    }

    public void setHWdUserAndGroupService(ReadOnlyHdwGroupService readOnlyHdwGroupService,
                                          ReadOnlyHdwUserService readOnlyHdwUserService)
    {
        this.readOnlyHdwGroupService = readOnlyHdwGroupService;
        this.readOnlyHdwUserService = readOnlyHdwUserService;
        this.isHdwServlet = true;
    }
}