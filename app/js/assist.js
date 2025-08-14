Util = {};
var EntityId;
var EntityName;
var temp;
var emailid;
var message;

// Subscribe to the EmbeddedApp onPageLoad event before initializing the widget 
ZOHO.embeddedApp.on("PageLoad", function(data) {
    EntityId = data.EntityId[0];
    console.log(EntityId);
    entityname = data.Entity;

    // Fetching the current record details and retrieving the necessary field information
    ZOHO.CRM.API.getRecord({ Entity: entityname, RecordID: EntityId })
    .then(function(data) {
        console.log('getRecord response:', data);
        var dataa = (data && data.data && data.data[0]) ? data.data[0] : null;
        if (!dataa) {
            console.error('No record data found.');
            return;
        }
        var email = dataa.Email;
        var casestatus = dataa.Status;
        if (!email) {
            console.warn('Email field is missing or empty in the CRM record.');
        }
        var customeremail = email ? encodeURIComponent(email) : '';

        var x = {
            "email": customeremail
        };

        // 🔄 Call your custom connector API to create a Zoho Assist session
        ZOHO.CRM.CONNECTOR.invokeAPI("talentbridge.assistconnector.createsession", x)
        .then(function(dataa) {
            try {
                var response = dataa.response;
                var parseresponse = JSON.parse(response);
                var representation = parseresponse.representation;

                // Extract session data
                var sessionid = representation.session_id;
                var customerurl = representation.customer_url;
                var technicianurl = representation.technician_url;

                // Display in widget HTML elements
                var emailInput = document.getElementById("customeremail");
                if (emailInput) {
                    emailInput.value = email || '';
                } else {
                    console.error('Input field with id "customeremail" not found.');
                }
                var anchor = document.getElementById("myAnchor");
                if (anchor) {
                    anchor.href = technicianurl;
                } else {
                    console.error('Anchor with id "myAnchor" not found.');
                }

                // 📦 Insert the session record in your custom module
                var recordData = {
                    "Name": "Remote Session - " + sessionid,
                    "talentbridge__Session_ID": sessionid,
                    "talentbridge__Case_Number": EntityId,
                    "talentbridge__Case_status_during_the_session_initiation": casestatus
                };

                ZOHO.CRM.API.insertRecord({
                    Entity: "talentbridge__Session_Details",
                    APIData: recordData,
                    Trigger: []
                }).then(function(data) {
                    console.log("Session record inserted:", data);
                }).catch(function(err) {
                    console.error('Error inserting session record:', err);
                });
            } catch (err) {
                console.error('Error parsing connector response or updating UI:', err);
            }

            ZOHO.embeddedApp.init();
        })
        .catch(function(err) {
            console.error('Error invoking connector API:', err);
        });
    })
    .catch(function(err) {
        console.error('Error fetching CRM record:', err);
    });
});
