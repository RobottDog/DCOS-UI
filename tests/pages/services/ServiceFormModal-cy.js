describe("Service Form Modal", function() {
  // We'll consider the two elements to be centered with one another if
  // their midpoints are within 5 pixels of one another.
  const alignmentThreshold = 5;

  context("Create", function() {
    function openServiceModal() {
      cy.get(".page-header-actions button").first().click();
    }

    function clickRunService() {
      cy.get(".panel .button").contains("Run a Service").click();
    }

    function openServiceForm() {
      cy
        .get(".create-service-modal-service-picker-option")
        .contains("Single Container")
        .click();
    }

    function openServiceJSON() {
      cy
        .get(".create-service-modal-service-picker-option")
        .contains("JSON Configuration")
        .click();
    }

    beforeEach(function() {
      cy.configureCluster({
        mesos: "1-empty-group",
        nodeHealth: true
      });
      cy.visitUrl({ url: "/services/overview" });
    });

    context("Root level", function() {
      it("Opens the right modal on click", function() {
        openServiceModal();
        cy.get(".modal-full-screen").should("to.have.length", 1);
      });

      it("contains the right group id in the form modal", function() {
        openServiceModal();
        openServiceForm();
        cy
          .get('.modal .menu-tabbed-view input[name="id"]')
          .should("to.have.value", "/");
      });

      it("contains the right JSON in the JSON editor", function() {
        openServiceModal();
        openServiceJSON();
        cy.get(".ace_content").should(function(nodeList) {
          expect(nodeList[0].textContent).to.contain('"id": "/"');
        });
      });

      it("remembers the selected form tab when switching back from JSON", function() {
        openServiceModal();
        openServiceForm();

        cy.get(".menu-tabbed-item").contains("Networking").click();

        cy
          .get(".menu-tabbed-view-container h2")
          .first()
          .should("to.have.text", "Networking");

        // Switch to JSON
        cy
          .get(".modal-full-screen-actions label")
          .contains("JSON Editor")
          .click();

        cy.get(".ace_content").should(function(nodeList) {
          expect(nodeList[0].textContent).to.contain('"id": "/"');
        });

        // Switch back to form
        cy
          .get(".modal-full-screen-actions label")
          .contains("JSON Editor")
          .click();

        cy
          .get(".menu-tabbed-view-container h2")
          .first()
          .should("to.have.text", "Networking");
      });
    });

    context("Group level", function() {
      beforeEach(function() {
        cy.visitUrl({ url: "/services/overview/%2Fmy-group" });
      });

      it("Opens the right modal on click", function() {
        clickRunService();
        cy.get(".modal-full-screen").should("to.have.length", 1);
      });

      it("contains the right group id in the modal", function() {
        clickRunService();
        openServiceForm();
        cy
          .get('.modal .menu-tabbed-view input[name="id"]')
          .should("to.have.value", "/my-group/");
      });

      it("contains the right JSON in the JSON editor", function() {
        clickRunService();
        openServiceJSON();
        cy.get(".ace_content").should(function(nodeList) {
          expect(nodeList[0].textContent).to.contain('"id": "/my-group/"');
        });
      });
    });

    context("default values", function() {
      function getFormValue(name) {
        openServiceModal();
        openServiceForm();

        return cy.get('.modal .menu-tabbed-view input[name="' + name + '"]');
      }

      it("contains right cpus default value", function() {
        getFormValue("cpus").should("to.have.value", "0.1");
      });

      it("contains right mem default value", function() {
        getFormValue("mem").should("to.have.value", "128");
      });

      it("contains right instances default value", function() {
        getFormValue("instances").should("to.have.value", "1");
      });

      it("uses Docker by default", function() {
        openServiceModal();
        openServiceJSON();
        cy.get(".ace_content").should(function(nodeList) {
          expect(nodeList[0].textContent).to.contain('"type": "DOCKER"');
        });
      });

      it("contains the right JSON in the JSON editor", function() {
        openServiceModal();
        openServiceJSON();
        cy.get(".ace_content").should(function(nodeList) {
          expect(nodeList[0].textContent).to.contain('"cpus": 0.1');
          expect(nodeList[0].textContent).to.contain('"instances": 1');
          expect(nodeList[0].textContent).to.contain('"mem": 128');
        });
      });
    });
  });

  context("Edit", function() {
    const SERVICE_SPEC = {
      id: "/sleep",
      cmd: "sleep 3000",
      instances: 1,
      cpus: 1,
      mem: 128,
      disk: 0,
      gpus: 0,
      backoffSeconds: 1,
      backoffFactor: 1.15,
      maxLaunchDelaySeconds: 3600,
      container: {
        type: "MESOS",
        volumes: [
          {
            containerPath: "data-1",
            mode: "RW",
            persistent: {
              size: 1,
              type: "root"
            }
          },
          {
            containerPath: "data-2",
            mode: "RW",
            persistent: {
              size: 2,
              type: "root"
            }
          },
          {
            containerPath: "data-3",
            mode: "RW",
            persistent: {
              size: 3,
              type: "root"
            }
          }
        ]
      },
      upgradeStrategy: {
        minimumHealthCapacity: 0.5,
        maximumOverCapacity: 0
      },
      residency: {
        relaunchEscalationTimeoutSeconds: 10,
        taskLostBehavior: "WAIT_FOREVER"
      },
      unreachableStrategy: {
        inactiveAfterSeconds: 3600,
        expungeAfterSeconds: 604800
      },
      killSelection: "YOUNGEST_FIRST",
      portDefinitions: [
        {
          port: 0,
          protocol: "tcp"
        }
      ],
      requirePorts: false
    };

    beforeEach(function() {
      cy.configureCluster({
        mesos: "1-task-with-volumes",
        nodeHealth: true
      });

      cy.visitUrl({ url: "/services/detail/%2Fsleep" });
      cy.get(".page-header-actions .dropdown").click();
      cy.get(".dropdown-menu-items").contains("Edit").click();
    });

    it("contains the right service id in the modal", function() {
      cy
        .get('.modal .menu-tabbed-view input[name="id"]')
        .should("to.have.value", "/sleep");
    });

    it("contains the right JSON in the JSON editor", function() {
      // Open JSON Editor
      cy.get(".modal .toggle-button + span").click();

      // Get Ace Editor instance from DOM as `textContent` only includes parts
      // of the JSON due to the Ace Editor rending optimizations.
      cy.window().then(function(window) {
        const editor = window.ace.edit("brace-editor");

        expect(JSON.parse(editor.getValue())).to.deep.equal(SERVICE_SPEC);
      });
    });
  });

  context("Picker", function() {
    beforeEach(function() {
      cy.configureCluster({
        mesos: "1-task-healthy"
      });
      cy.visitUrl({ url: "/services/overview/%2F/create" });
    });

    it("should fill the entire viewport", function() {
      var isModalFullScreen = true;

      cy.window().then(function($window) {
        cy.get(".modal-full-screen").should(function($element) {
          if (
            $element[0].clientHeight !== $window.innerHeight ||
            $element[0].clientWidth !== $window.innerWidth
          ) {
            isModalFullScreen = false;
          }
          expect(isModalFullScreen).to.be.equal(true);
        });
      });
    });

    it("should be horizontally and vertically centered in the modal container", function() {
      cy.get(".modal-body-wrapper").should(function($modalWrapper) {
        const modalWrapperRect = $modalWrapper[0].getBoundingClientRect();
        const modalWrapperMidpointY = Math.abs(
          modalWrapperRect.top + modalWrapperRect.height / 2
        );
        const modalWrapperMidpointX = Math.abs(
          modalWrapperRect.left + modalWrapperRect.width / 2
        );

        const $modalContent = $modalWrapper.find(
          ".create-service-modal-service-picker-options"
        );
        const modalContentRect = $modalContent[0].getBoundingClientRect();
        const modalContentMidpointY = Math.abs(
          modalContentRect.top + modalContentRect.height / 2
        );
        const modalContentMidpointX = Math.abs(
          modalContentRect.left + modalContentRect.width / 2
        );

        const topPosDifference = Math.abs(
          modalWrapperMidpointY - modalContentMidpointY
        );
        const leftPosDifference = Math.abs(
          modalWrapperMidpointX - modalContentMidpointX
        );

        expect(topPosDifference <= alignmentThreshold).to.be.equal(true);
        expect(leftPosDifference <= alignmentThreshold).to.be.equal(true);
      });
    });

    it("should have four options to choose from", function() {
      cy.get(".panel-grid h5").should(function(items) {
        const texts = items
          .map(function(i, el) {
            return cy.$(el).text();
          })
          .get();

        expect(texts).to.deep.eq([
          "Single Container",
          "Multi-container (Pod)",
          "JSON Configuration",
          "Install a Package"
        ]);
      });
    });

    it("should contain panes with the same width and height", function() {
      var isPanesSameSize = true;

      cy
        .get(".create-service-modal-service-picker-option")
        .should(function($elements) {
          const firstElementWidth = $elements[0].clientWidth;
          const firstElementHeight = $elements[0].clientHeight;

          for (var i = 1; i <= $elements.length - 1; i++) {
            const currentElementWidth = $elements[i].clientWidth;
            const currentElementHeight = $elements[i].clientHeight;

            if (
              currentElementWidth !== firstElementWidth ||
              currentElementHeight !== firstElementHeight
            ) {
              isPanesSameSize = false;
            }
          }
          expect(isPanesSameSize).to.be.equal(true);
        });
    });
  });

  context("Create Layout (Single Container)", function() {
    beforeEach(function() {
      cy.configureCluster({
        mesos: "1-task-healthy"
      });

      cy.visitUrl({ url: "/services/overview/%2F/create" });
      cy
        .get(".create-service-modal-service-picker-option")
        .contains("Single Container")
        .click();
    });

    context("Form: Tabs", function() {
      it("should have a divider that fills the entire height of parent", function() {
        cy.get(".menu-tabbed-vertical").then(function($divider) {
          expect($divider.height()).to.equal($divider.parent().height());
        });
      });

      it("should change content when different tab is clicked", function() {
        cy.get(".menu-tabbed-item").contains("Networking").click();

        cy
          .get(".menu-tabbed-view-container h2")
          .first()
          .should("to.have.text", "Networking");
      });
    });

    context("Form: Edit", function() {
      beforeEach(function() {
        // Edit form
        cy.contains(".form-group", "Service ID").within(function() {
          cy.get("input.form-control").clear().type("/test-back-button-prompt");
        });
      });

      context("Back Button: Click", function() {
        beforeEach(function() {
          // Click back button
          cy.get(".modal-header button").contains("Back").click();
        });

        it("should prompt when clicking the back button", function() {
          cy.contains(".modal", "Discard Changes?");
        });

        it('should discard changes and navigate back to service picker when clicking "discard"', function() {
          cy.contains(".modal", "Discard Changes?").within(function() {
            cy.contains("button", "Discard").click();
          });

          // Modal should have closed
          cy.contains(".modal", "Discard Changes?").should("not.exist");

          // Service picker options screen should show
          cy
            .get(".create-service-modal-service-picker-options")
            .should("exist");
        });

        it('should cancel backward navigation when clicking "cancel"', function() {
          cy.contains(".modal", "Discard Changes?").within(function() {
            cy.contains("button", "Cancel").click();
          });

          // Modal should have closed
          cy.contains(".modal", "Discard Changes?").should("not.exist");

          // Service form should show with correct value
          cy.contains(".form-group", "Service ID").within(function() {
            cy
              .get("input.form-control")
              .should("have.value", "/test-back-button-prompt");
          });
        });
      });
    });

    context("JSON Editor toggle", function() {
      beforeEach(function() {
        // Ensure we reset viewport
        cy.viewport("macbook-15");
        // Enable JSON Editor
        cy
          .get(".modal-full-screen-actions label")
          .contains("JSON Editor")
          .click();
      });

      it("should display JSON editor next to form when screen width >= large", function() {
        cy
          .get(".modal-full-screen-side-panel.is-visible")
          .then(function($jsonEditor) {
            expect($jsonEditor.width()).to.equal(500);

            expect(
              $jsonEditor.parents(".modal-full-screen").width()
            ).to.be.above($jsonEditor.width());
          });
      });

      it("should display JSON editor only when screen width < large", function() {
        cy.viewport("iphone-6+");

        cy
          .get(".modal-full-screen-side-panel.is-visible")
          .then(function($jsonEditor) {
            expect($jsonEditor.parents(".modal-full-screen").width()).to.equal(
              $jsonEditor.width()
            );
          });
      });

      it("should hide JSON editor when toggle once more", function() {
        // Disable JSON Editor
        cy
          .get(".modal-full-screen-actions label")
          .contains("JSON Editor")
          .click();

        // Side panel with is-visible class should no longer exist
        cy.get(".modal-full-screen-side-panel.is-visible").should("not.exist");
      });

      it("should update JSON when editing form", function() {
        // Edit form
        cy.contains(".form-group", "Service ID").within(function() {
          cy.get("input.form-control").clear().type("/test-json-update");
        });

        cy.get(".ace_content").should(function(nodeList) {
          expect(nodeList[0].textContent).to.contain(
            '"id": "/test-json-update"'
          );
        });
      });

      it("should update form when editing JSON content", function() {
        // Get Ace Editor instance from DOM as `textContent` only includes parts
        // of the JSON due to the Ace Editor rending optimizations.
        cy.window().then(function(window) {
          const editor = window.ace.edit("brace-editor");

          editor.setValue(
            `
            {
              "id": "/test-form-update",
              "instances": 1,
              "container": {
                "type": "DOCKER"
              },
              "cpus": 0.1,
              "mem": 128
            }`
          );
        });

        cy.contains(".form-group", "Service ID").within(function() {
          cy
            .get("input.form-control")
            .should("to.have.value", "/test-form-update");
        });
      });
    });

    context("Service: General", function() {
      it('Should have a "Service ID" field', function() {
        cy.get(".form-group").contains("Service ID");
      });

      it('Should have a "Instances" field', function() {
        cy.get(".form-group").contains("Instances");
      });

      it('Should have a "Container Image" field', function() {
        cy.get(".form-group").contains("Container Image");
      });

      it('Should have a "CPUs" field', function() {
        cy.get(".form-group").contains("CPUs");
      });

      it('Should have a "Memory (MiB)" field', function() {
        cy.get(".form-group").contains("Memory (MiB)");
      });

      it('Should have a "Command" field', function() {
        cy.get(".form-group").contains("Command");
      });

      it('Should not have a "Container Runtime" section', function() {
        cy
          .get(".menu-tabbed-view")
          .contains("Container Runtime")
          .should("to.have.length", 0);
      });

      it('Should not have a "Placement Constraints" section', function() {
        cy
          .get(".menu-tabbed-view")
          .contains("Placement Constraints")
          .should("to.have.length", 0);
      });

      it('Should not have a "Add Placement Constraint" link', function() {
        cy
          .get(".menu-tabbed-view .button.button-primary-link")
          .contains("Add Placement Constraint")
          .should("to.have.length", 0);
      });

      it('Should not have a "Advanced Settings" section', function() {
        cy
          .get(".menu-tabbed-view")
          .contains("Advanced Settings")
          .should("to.have.length", 0);
      });

      it('Should not have a "Grant Runtime Privileges" checkbox', function() {
        cy
          .get(".menu-tabbed-view")
          .contains("Grant Runtime Privileges")
          .should("to.have.length", 0);
      });

      it('Should not have a "Force Pull Image On Launch" checkbox', function() {
        cy
          .get(".menu-tabbed-view")
          .contains("Force Pull Image On Launch")
          .should("to.have.length", 0);
      });

      it('Should not have a "GPUs" field', function() {
        cy.get(".form-group").contains("GPUs").should("to.have.length", 0);
      });

      it('Should not have a "Disk (MiB)" field', function() {
        cy
          .get(".form-group")
          .contains("Disk (MiB)")
          .should("to.have.length", 0);
      });

      it('Should not have a "Add Artifact" link', function() {
        cy
          .get(".menu-tabbed-view .button.button-primary-link")
          .contains("Add Artifact")
          .should("to.have.length", 0);
      });
    });

    context("Service: More Settings", function() {
      beforeEach(function() {
        cy.get("a.clickable").contains("More Settings").click();
      });

      it('Should have a "Container Runtime" section', function() {
        cy.get(".menu-tabbed-view").contains("Container Runtime");
      });

      it('Should have a "Placement Constraints" section', function() {
        cy.get(".menu-tabbed-view").contains("Placement Constraints");
      });

      it('Should have a "Add Placement Constraint" link', function() {
        cy
          .get(".menu-tabbed-view .button.button-primary-link")
          .contains("Add Placement Constraint");
      });

      it("Should vertically align the placement constraint delete row button", function() {
        cy
          .get(".menu-tabbed-view .button.button-primary-link")
          .contains("Add Placement Constraint")
          .click();

        cy
          .get('.menu-tabbed-view input[name="constraints.0.fieldName"')
          .should(function($inputElement) {
            const $wrappingLabel = $inputElement.closest(".form-group");
            const $deleteButtonFormGroup = $wrappingLabel.siblings(
              ".form-group-without-top-label"
            );

            const inputClientRect = $inputElement
              .get(0)
              .getBoundingClientRect();
            const inputMidpoint =
              inputClientRect.top + inputClientRect.height / 2;

            const deleteButtonClientRect = $deleteButtonFormGroup
              .find(".button")
              .get(0)
              .getBoundingClientRect();
            const deleteButtonMidpoint =
              deleteButtonClientRect.top + deleteButtonClientRect.height / 2;

            const midpointDifference = Math.abs(
              inputMidpoint - deleteButtonMidpoint
            );

            expect(midpointDifference <= alignmentThreshold).to.equal(true);
          });
      });

      it('Should have a "Advanced Settings" section', function() {
        cy.get(".menu-tabbed-view").contains("Advanced Settings");
      });

      it('Should have a "Grant Runtime Privileges" checkbox', function() {
        cy.get(".menu-tabbed-view").contains("Grant Runtime Privileges");
      });

      it('Should have a "Force Pull Image On Launch" checkbox', function() {
        cy.get(".menu-tabbed-view").contains("Force Pull Image On Launch");
      });

      it('Should have a "GPUs" field', function() {
        cy.get(".form-group").contains("GPUs");
      });

      it('Should have a "Disk (MiB)" field', function() {
        cy.get(".form-group").contains("Disk (MiB)");
      });

      it('Should have a "Add Artifact" link', function() {
        cy
          .get(".menu-tabbed-view .button.button-primary-link")
          .contains("Add Artifact");
      });

      context("Add Placement Constraint", function() {
        beforeEach(function() {
          cy
            .get(".menu-tabbed-view .button.button-primary-link")
            .contains("Add Placement Constraint")
            .click();

          cy.get(".menu-tabbed-view").as("tabView");
        });

        it('Should add rows when "Add Placement Constraint" link clicked', function() {
          // Field
          cy
            .get("@tabView")
            .find('.form-control[name="constraints.0.fieldName"]')
            .should("exist");

          // operator
          cy
            .get("@tabView")
            .find('select[name="constraints.0.operator"]')
            .should("exist");

          // value
          cy
            .get("@tabView")
            .find('.form-control[name="constraints.0.value"]')
            .should("exist");
        });

        it("Should remove rows when remove button clicked", function() {
          cy.contains(".form-row", "Operator").within(function() {
            // Click delete button
            cy.get("a.button").click();
          });

          // Field
          cy
            .get("@tabView")
            .find('.form-control[name="constraints.0.fieldName"]')
            .should("not.exist");

          // operator
          cy
            .get("@tabView")
            .find('select[name="constraints.0.operator"]')
            .should("not.exist");

          // value
          cy
            .get("@tabView")
            .find('.form-control[name="constraints.0.value"]')
            .should("not.exist");
        });

        it('Should hide the "value" when "Unique" is selected in operator dropdown', function() {
          cy
            .get("@tabView")
            .find('select[name="constraints.0.operator"]')
            .select("UNIQUE");

          // value
          cy
            .get("@tabView")
            .find('select[name="constraints.0.operator"]')
            .parents(".form-group")
            .next()
            .should("have.class", "hidden");
        });
      });

      context("Add Artifact", function() {
        beforeEach(function() {
          cy
            .get(".menu-tabbed-view .button.button-primary-link")
            .contains("Add Artifact")
            .click();

          cy.get(".menu-tabbed-view").as("tabView");
        });

        it('Should add row with an input when "Add Artifact" link clicked', function() {
          // artifact uri
          cy
            .get("@tabView")
            .find('.form-control[name="fetch.0.uri"]')
            .should("exist");
        });

        it("Should remove row when remove button clicked", function() {
          cy
            .get("@tabView")
            .find('.form-control[name="fetch.0.uri"]')
            .parents(".form-row")
            .within(function() {
              // Click delete button
              cy.get("a.button").click();
            });

          // artifact uri
          cy
            .get("@tabView")
            .find('.form-control[name="fetch.0.uri"]')
            .should("not.exist");
        });
      });

      context("Switching to Mesos Runtime", function() {
        beforeEach(function() {
          // Set viewport so we have side-by-side JSON editor
          cy.viewport("macbook-15");
          // Enable JSON Editor
          cy
            .get(".modal-full-screen-actions label")
            .contains("JSON Editor")
            .click();

          cy.get("label").contains("Mesos Runtime").click();
        });

        it("should switch from Docker to Mesos correctly", function() {
          cy.get(".ace_content").should(function(nodeList) {
            expect(nodeList[0].textContent).not.to.contain('"type": "DOCKER"');
          });
        });

        it('should disable the "Advanced Settings" section', function() {
          cy.contains("Advanced Settings").parent().within(function() {
            cy
              .get("label.form-control-toggle.disabled")
              .should("have.length", 2);
          });
        });
      });
    });

    context("Service: Networking", function() {
      /**
       * Clicks the runtime option under more settings
       * @param {String} runtimeText one of ['Docker Engine', 'Mesos Runtime']
       */
      function setRuntime(runtimeText) {
        cy.get("a.clickable").contains("More Settings").click();

        cy.get("label").contains(runtimeText).click();
      }

      function clickNetworkingTab() {
        cy.get(".menu-tabbed-item").contains("Networking").click();
      }

      context("Network Type", function() {
        it('should have all available types when "Docker Engine" selected', function() {
          setRuntime("Docker Engine");
          clickNetworkingTab();

          cy.get('select[name="networks.0.mode"]').as("containerDockerNetwork");

          // HOST
          cy
            .get("@containerDockerNetwork")
            .children("option:eq(0)")
            .should("have.value", "HOST")
            .should("not.have.attr", "disabled");

          // BRIDGE
          cy
            .get("@containerDockerNetwork")
            .children("option:eq(1)")
            .should("have.value", "BRIDGE")
            .should("not.have.attr", "disabled");

          // USER.dcos-1
          cy
            .get("@containerDockerNetwork")
            .children("option:eq(2)")
            .should("have.value", "USER.dcos-1")
            .should("not.have.attr", "disabled");

          // User.dcos-2
          cy
            .get("@containerDockerNetwork")
            .children("option:eq(3)")
            .should("have.value", "USER.dcos-2")
            .should("not.have.attr", "disabled");
        });

        it('should disable bridge networking when "Mesos Runtime" selected', function() {
          setRuntime("Mesos Runtime");
          clickNetworkingTab();

          cy.get('select[name="networks.0.mode"]').as("containerDockerNetwork");

          // HOST
          cy
            .get("@containerDockerNetwork")
            .children("option:eq(0)")
            .should("have.value", "HOST")
            .should("not.have.attr", "disabled");

          // BRIDGE - disabled
          cy
            .get("@containerDockerNetwork")
            .children("option:eq(1)")
            .should("have.value", "BRIDGE")
            .should("have.attr", "disabled");

          // USER.dcos-1
          cy
            .get("@containerDockerNetwork")
            .children("option:eq(2)")
            .should("have.value", "USER.dcos-1")
            .should("not.have.attr", "disabled");

          // User.dcos-2
          cy
            .get("@containerDockerNetwork")
            .children("option:eq(3)")
            .should("have.value", "USER.dcos-2")
            .should("not.have.attr", "disabled");
        });
      });

      context("Add Service Endpoint", function() {
        function addServiceEndpoint() {
          cy
            .get(".menu-tabbed-view .button.button-primary-link")
            .contains("Add Service Endpoint")
            .click();
        }

        beforeEach(function() {
          clickNetworkingTab();
          addServiceEndpoint();
          // Alias tab view for cached lookups
          cy.get(".menu-tabbed-view").as("tabView");
        });

        it('Should add new set of form fields when "Add Service Endpoint" link clicked', function() {
          cy
            .get("@tabView")
            .find('.form-control[name="portDefinitions.0.name"]')
            .should("exist");
        });

        it('Should remove "Service Endpoint" form fields when remove button clicked', function() {
          cy
            .get("@tabView")
            .find('.form-control[name="portDefinitions.0.name"]')
            .parents(".panel")
            .within(function() {
              // Click delete button
              cy.get("a.button").click();
            });

          cy
            .get("@tabView")
            .find('.form-control[name="portDefinitions.0.name"]')
            .should("not.exist");
        });

        context("type: HOST", function() {
          context("Assign Host Ports Automatically", function() {
            it('should disable "Host Port" text field when "Assign Host Ports Automatically" is checked', function() {
              cy
                .get("@tabView")
                .find('.form-control[name="portsAutoAssign"]')
                .check();

              cy
                .get("@tabView")
                .find('.form-control[name="portDefinitions.0.hostPort"]')
                .should("have.attr", "disabled");
            });

            it('should append value for "Host Port" to service address when "Assign Host Ports Automatically" is not checked', function() {
              cy.contains("label", "Assign Host Ports Automatically").click();
              cy
                .contains("label", "Enable Load Balanced Service Address")
                .click();

              // Set value for host port
              cy
                .get("@tabView")
                .find('.form-control[name="portDefinitions.0.hostPort"]')
                .type(7);

              cy.contains(".marathon.l4lb.thisdcos.directory:7");
            });
          });

          it('should hide "Container Port"', function() {
            cy.get('select[name="networks.0.mode"]').select("HOST");

            cy
              .get("@tabView")
              .find('.form-control[name="portDefinitions.0.containerPort"]')
              .should("not.exist");

            cy
              .get("@tabView")
              .find('.form-control[name="portDefinitions.0.name"]')
              .should("exist");

            cy
              .get("@tabView")
              .find('.form-control[name="portDefinitions.0.hostPort"]')
              .should("exist");

            cy
              .get("@tabView")
              .find('.form-control[name="portDefinitions.0.protocol.udp"]')
              .should("exist");

            cy
              .get("@tabView")
              .find('.form-control[name="portDefinitions.0.protocol.tcp"]')
              .should("exist");

            cy
              .get("@tabView")
              .find('.form-control[name="portDefinitions.0.loadBalanced"]')
              .should("exist");
          });
        });

        context("type: BRIDGE", function() {
          it('should show "Container Port" and "Protocol"', function() {
            cy.get('select[name="networks.0.mode"]').select("BRIDGE");

            cy
              .get("@tabView")
              .find('.form-control[name="portDefinitions.0.containerPort"]')
              .should("exist");

            cy
              .get("@tabView")
              .find('.form-control[name="portDefinitions.0.name"]')
              .should("exist");

            cy
              .get("@tabView")
              .find('.form-control[name="portDefinitions.0.hostPort"]')
              .should("exist");

            cy
              .get("@tabView")
              .find('.form-control[name="portDefinitions.0.protocol.udp"]')
              .should("exist");

            cy
              .get("@tabView")
              .find('.form-control[name="portDefinitions.0.protocol.tcp"]')
              .should("exist");

            cy
              .get("@tabView")
              .find('.form-control[name="portDefinitions.0.loadBalanced"]')
              .should("exist");
          });
        });

        context("type: USER (Virtual Network: dcos)", function() {
          it('should hide "Host Port" and "Protocol"', function() {
            cy.get('select[name="networks.0.mode"]').select("USER.dcos-1");

            cy
              .get("@tabView")
              .find('.form-control[name="portDefinitions.0.containerPort"]')
              .should("exist");

            cy
              .get("@tabView")
              .find('.form-control[name="portDefinitions.0.name"]')
              .should("exist");

            cy
              .get("@tabView")
              .find('.form-control[name="portDefinitions.0.hostPort"]')
              .should("not.exist");

            cy
              .get("@tabView")
              .find('.form-control[name="portDefinitions.0.protocol.udp"]')
              .should("not.exist");

            cy
              .get("@tabView")
              .find('.form-control[name="portDefinitions.0.protocol.tcp"]')
              .should("not.exist");

            cy
              .get("@tabView")
              .find('.form-control[name="portDefinitions.0.loadBalanced"]')
              .should("exist");
          });

          it('should not hide "Host Port" and "Protocol" when "Port Mapping" is enabled', function() {
            cy.get('select[name="networks.0.mode"]').select("USER.dcos-1");

            // Enable port mapping
            cy
              .get("@tabView")
              .find('.form-control[name="portDefinitions.0.portMapping"]')
              .parents("label")
              .click();

            cy
              .get("@tabView")
              .find('.form-control[name="portDefinitions.0.containerPort"]')
              .should("exist");

            cy
              .get("@tabView")
              .find('.form-control[name="portDefinitions.0.name"]')
              .should("exist");

            cy
              .get("@tabView")
              .find('.form-control[name="portDefinitions.0.hostPort"]')
              .should("exist");

            cy
              .get("@tabView")
              .find('.form-control[name="portDefinitions.0.protocol.udp"]')
              .should("exist");

            cy
              .get("@tabView")
              .find('.form-control[name="portDefinitions.0.protocol.tcp"]')
              .should("exist");

            cy
              .get("@tabView")
              .find('.form-control[name="portDefinitions.0.loadBalanced"]')
              .should("exist");
          });
        });
      });
    });

    context("Service: Volumes", function() {
      beforeEach(function() {
        cy.get(".menu-tabbed-item").contains("Volumes").click();

        // Alias tab view for cached lookups
        cy.get(".menu-tabbed-view").as("tabView");
      });

      context("Local Volumes", function() {
        beforeEach(function() {
          cy
            .get(".menu-tabbed-view .button.button-primary-link")
            .contains("Add Local Volume")
            .click();
        });

        it('Should add new set of form fields when "Add Local Volume" link clicked', function() {
          cy
            .get("@tabView")
            .contains(".form-group", "Volume Type")
            .within(function() {
              cy
                .get("select")
                .should("have.attr", "name", "localVolumes.0.type");
            });
        });

        it('Should add new set of form fields when "Persistent Volume" is selected as volume type', function() {
          cy
            .get("@tabView")
            .find('select[name="localVolumes.0.type"]')
            .select("PERSISTENT");

          // Size input
          cy
            .get("@tabView")
            .find('.form-control[name="localVolumes.0.size"]')
            .should("exist");

          // Container Path input
          cy
            .get("@tabView")
            .find('.form-control[name="localVolumes.0.containerPath"]')
            .should("exist");
        });

        it('Should remove "Volume" form fields when remove button clicked', function() {
          cy
            .get("@tabView")
            .find('select[name="localVolumes.0.type"]')
            .parents(".panel")
            .within(function() {
              // Click delete button
              cy.get("a.button").click();
            });

          cy
            .get("@tabView")
            .find('.form-control[name="localVolumes.0.type"]')
            .should("not.exist");
        });
      });

      context("External Volumes", function() {
        beforeEach(function() {
          cy
            .get(".menu-tabbed-view .button.button-primary-link")
            .contains("Add External Volume")
            .click();
        });

        it('Should add new set of form fields when "Add External Volume" link clicked', function() {
          // Name input
          cy
            .get("@tabView")
            .find('.form-control[name="externalVolumes.0.name"]')
            .should("exist");

          // Size input
          cy
            .get("@tabView")
            .find('.form-control[name="externalVolumes.0.size"]')
            .should("exist");

          // Container Path input
          cy
            .get("@tabView")
            .find('.form-control[name="externalVolumes.0.containerPath"]')
            .should("exist");
        });

        it('Should remove "Volume" form fields when remove button clicked', function() {
          cy.contains(".panel", "Name").within(function() {
            // Click delete button
            cy.get("a.button").click();
          });

          cy.should(
            "not.contain",
            '.form-control[name="externalVolumes.0.name"]'
          );
        });
      });
    });

    context("Service: Health Checks", function() {
      beforeEach(function() {
        cy.get(".menu-tabbed-item").contains("Health Checks").click();

        cy
          .get(".menu-tabbed-view .button.button-primary-link")
          .contains("Add Health Check")
          .click();

        // Alias tab view for cached lookups
        cy.get(".menu-tabbed-view").as("tabView");
      });

      it('Should add new set of form fields when "Add Health Check" link clicked', function() {
        cy
          .get("@tabView")
          .contains(".form-group", "Protocol")
          .within(function() {
            cy
              .get("select")
              .should("have.attr", "name", "healthChecks.0.protocol");
          });
      });

      it('Should remove "Health Check" form fields when remove button clicked', function() {
        cy.contains(".panel", "Protocol").within(function() {
          // Click delete button
          cy.get("a.button").click();
        });

        cy.should(
          "not.contain",
          '.form-control[name="healthChecks.0.protocol"]'
        );
      });

      it('Should display textarea when selected Protocol is "Command"', function() {
        cy
          .get("@tabView")
          .contains(".form-group", "Protocol")
          .within(function() {
            cy.get("select").select("COMMAND");
          });

        // Command input
        cy
          .get("@tabView")
          .find('.form-control[name="healthChecks.0.command"]')
          .should("exist");
      });

      it('Should display row of fields when selected Protocol is "HTTP"', function() {
        cy
          .get("@tabView")
          .contains(".form-group", "Protocol")
          .within(function() {
            cy.get("select").select("HTTP");
          });

        // Service Endpoint Select
        cy
          .get("@tabView")
          .find('select[name="healthChecks.0.portIndex"]')
          .should("exist");

        // Path input
        cy
          .get("@tabView")
          .find('.form-control[name="healthChecks.0.path"]')
          .should("exist");

        // Https input
        cy
          .get("@tabView")
          .find('.form-control[name="healthChecks.0.https"]')
          .should("exist");
      });

      context("Advanced Health Check Section", function() {
        function toggleAdvancedHealthCheckSettings() {
          cy
            .get(".menu-tabbed-view .button.button-primary-link")
            .contains("Advanced Health Check Settings")
            .click();
        }

        it('Should add new set of form fields when "Advanced Health Check Settings" link clicked', function() {
          cy
            .get("@tabView")
            .contains(".form-group", "Protocol")
            .within(function() {
              cy.get("select").select("HTTP");
            });

          toggleAdvancedHealthCheckSettings();

          // Grace Period
          cy
            .get("@tabView")
            .find('.form-control[name="healthChecks.0.gracePeriodSeconds"]')
            .should("exist");

          // Interval
          cy
            .get("@tabView")
            .find('.form-control[name="healthChecks.0.intervalSeconds"]')
            .should("exist");

          // Timeout
          cy
            .get("@tabView")
            .find('.form-control[name="healthChecks.0.timeoutSeconds"]')
            .should("exist");

          // Max Failures
          cy
            .get("@tabView")
            .find('.form-control[name="healthChecks.0.maxConsecutiveFailures"]')
            .should("exist");
        });

        it('Should remove new set of form fields when "Advanced Health Check Settings" link clicked again', function() {
          cy
            .get("@tabView")
            .contains(".form-group", "Protocol")
            .within(function() {
              cy.get("select").select("HTTP");
            });

          // Toggle open
          toggleAdvancedHealthCheckSettings();
          // Toggle closed
          toggleAdvancedHealthCheckSettings();

          // Grace Period
          cy
            .get("@tabView")
            .find('.form-control[name="healthChecks.0.gracePeriodSeconds"]')
            .should("not.exist");

          // Interval
          cy
            .get("@tabView")
            .find('.form-control[name="healthChecks.0.intervalSeconds"]')
            .should("not.exist");

          // Timeout
          cy
            .get("@tabView")
            .find('.form-control[name="healthChecks.0.timeoutSeconds"]')
            .should("not.exist");

          // Max Failures
          cy
            .get("@tabView")
            .find('.form-control[name="healthChecks.0.maxConsecutiveFailures"]')
            .should("not.exist");
        });
      });
    });

    context("Service: Environment", function() {
      beforeEach(function() {
        cy.get(".menu-tabbed-item").contains("Environment").click();

        // Alias tab view for cached lookups
        cy.get(".menu-tabbed-view").as("tabView");
      });

      context("Environment", function() {
        beforeEach(function() {
          cy
            .get(".menu-tabbed-view .button.button-primary-link")
            .contains("Add Environment Variable")
            .click();
        });

        it('Should add new set of form fields when "Add Environment Variable" link clicked', function() {
          // Key
          cy
            .get("@tabView")
            .find('.form-control[name="env.0.key"]')
            .should("exist");

          // Value
          cy
            .get("@tabView")
            .find('.form-control[name="env.0.value"]')
            .should("exist");
        });

        it('Should remove "Environment Variable" form fields when remove button clicked', function() {
          cy.contains(".form-row", "Key").within(function() {
            // Click delete button
            cy.get("a.button").click();
          });

          cy.should("not.contain", '.form-control[name="env.0.key"]');
        });
      });

      context("Labels", function() {
        beforeEach(function() {
          cy
            .get(".menu-tabbed-view .button.button-primary-link")
            .contains("Add Label")
            .click();
        });

        it('Should add new set of form fields when "Add Label" link clicked', function() {
          // Key
          cy
            .get("@tabView")
            .find('.form-control[name="labels.0.key"]')
            .should("exist");

          // Value
          cy
            .get("@tabView")
            .find('.form-control[name="labels.0.value"]')
            .should("exist");
        });

        it('Should remove "Label" form fields when remove button clicked', function() {
          cy.contains(".form-row", "Key").within(function() {
            // Click delete button
            cy.get("a.button").click();
          });

          cy.should("not.contain", '.form-control[name="labels.0.key"]');
        });
      });
    });

    context("Review and Run Service", function() {
      beforeEach(function() {
        // Fill in SERVICE ID
        cy.get('.form-control[name="id"]').clear().type("/test-review-and-run");

        // Fill in CONTAINER IMAGE
        cy
          .get('.form-control[name="container.docker.image"]')
          .clear()
          .type("nginx");

        // Click review and run
        cy
          .get(".modal-full-screen-actions")
          .contains("button", "Review & Run")
          .click();
      });

      it("should not show non configured fields", function() {
        // Fields that should not appear:
        //  - Service Endpoints
        //  - Volumes
        //  - Health Checks
        //  - Environment Variables
        //  - Labels
        //
        // To test this, we filter for H1's and assert that only 2 exist - one
        // for General field and one for Network field
        cy.get("h1.configuration-map-heading").should(function($h1) {
          // Should have found 2 elements
          expect($h1).to.have.length(2);

          // First should be General
          expect($h1.eq(0)).to.contain("General");

          // Second should be Network
          expect($h1.eq(1)).to.contain("Network");
        });
      });

      it('should navigate back to the form when "edit" button is clicked', function() {
        // Click back
        cy.get(".modal-full-screen-actions").contains("button", "Back").click();

        // Verify form has correct Service ID
        cy
          .get('.form-control[name="id"]')
          .should("to.have.value", "/test-review-and-run");

        // Verify form has correct container image
        cy
          .get('.form-control[name="container.docker.image"]')
          .should("to.have.value", "nginx");
      });
    });
  });

  context("Create Layout (Multi Container)", function() {
    beforeEach(function() {
      cy.configureCluster({
        mesos: "1-task-healthy"
      });

      cy.visitUrl({ url: "/services/overview/%2F/create" });
      cy
        .get(".create-service-modal-service-picker-option")
        .contains("Multi-container (Pod)")
        .click();
    });

    context("Service: General", function() {
      it('Should have a "Service ID" field', function() {
        cy.get(".form-group").contains("Service ID");
      });

      it('Should have a "Instances" field', function() {
        cy.get(".form-group").contains("Instances");
      });
    });

    context("Service: container settings", function() {
      beforeEach(function() {
        cy.get(".menu-tabbed-item").contains("container-1").click();
      });

      context("Service: More Settings", function() {
        beforeEach(function() {
          cy.get("a.clickable").contains("More Settings").click();
        });

        it('Should have a "Add Artifact" link', function() {
          cy
            .get(".menu-tabbed-view .button.button-primary-link")
            .contains("Add Artifact");
        });
      });
    });

    context("Multi-container (pod)", function() {
      beforeEach(function() {
        cy
          .get(".menu-tabbed-item-label")
          .eq(0)
          .click()
          .get(".menu-tabbed-view h2")
          .contains("Service");
      });

      it("Should add new container", function() {
        cy.get(".pod-narrow.pod-short").should("to.have.length", 1);
        cy.get(".menu-tabbed-view .button.button-primary-link").eq(3).click();
        cy.get(".pod-narrow.pod-short").should("to.have.length", 2);
      });

      it("Should contain two containers navigation under Services tab", function() {
        cy
          .get(".menu-tabbed-item-label")
          .eq(0)
          .siblings()
          .should("to.have.length", 1);

        cy.get(".menu-tabbed-view .button.button-primary-link").eq(3).click();

        cy
          .get(".menu-tabbed-item-label")
          .eq(0)
          .siblings()
          .should("to.have.length", 2);
      });

      it("Should be right aligned of the parent", function() {
        cy.get(".menu-tabbed-view .button.button-primary-link").eq(3).click();

        cy
          .get(".menu-tabbed-item-label")
          .eq(0)
          .siblings()
          .each(function($element) {
            const $parentLeftPosition = $element
              .parent()[0]
              .getBoundingClientRect().left;
            const $elementLeftPosition = $element[0].getBoundingClientRect()
              .left;
            const threshold = 10;
            const difference = $elementLeftPosition - $parentLeftPosition;

            expect(difference >= threshold).to.equal(true);
          });
      });
    });
  });

  context("Multi-container - Review & Run", function() {
    beforeEach(function() {
      cy.configureCluster({
        mesos: "1-task-healthy"
      });

      cy.visitUrl({ url: "/services/overview/%2F/create" });
      cy
        .get(".create-service-modal-service-picker-option")
        .contains("Multi-container (Pod)")
        .click();

      // Fill in SERVICE ID
      cy.get('.form-control[name="id"]').clear().type("/test-review-and-run");
    });

    it("Should contain two containers at review and run modal", function() {
      // Add a second container
      cy.get(".menu-tabbed-view .button.button-primary-link").eq(3).click();

      // Click review and run
      cy
        .get(".modal-full-screen-actions")
        .contains("button", "Review & Run")
        .click();

      // assert review and run modal
      cy
        .get(".detail-view-section-heading.configuration-map-heading")
        .eq(1)
        .contains("Containers")
        .siblings()
        .should("to.have.length", 2);
    });
  });
});
