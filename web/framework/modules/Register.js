/**

	An app for registering participants

*/
define([
	// Application.
	"App",

	"framework/modules/Participant",

	"framework/util/jquery/jQuery.toggleButton",
	"vendor/bootstrap/js/bootstrap", // for button bar radio
],

function (App, Participant) {

	var Register = App.module();

	function updateModel(data, name) {
		// check if we already have this guy
		var exists = this.collection.find(function (elem) {
			return elem.get("alias") === data.id;
		});

		if (exists) {
			var message = data.id + " is already registered.";
			$("<div class='alert fade in'>"+message+"</div>").appendTo(this.$(".alert-container").empty()).alert();
			return false;
		}

		this.model.set("alias", data.id);
		if (name) {
			this.model.set("name", name);
		}
		return true;
	}

	Register.Views.FormRegistration = App.BaseView.extend({
		template: "framework/templates/register/form",

		events: {
			"click .register-submit" : "register",
			"change #manual-reg-alias": "hideAlert"
		},

		hideAlert: function () {
			this.$(".alert").alert('close');
		},

		listenForId: function (event) {
			console.log("listen for alias", this);
			this.model.set("alias", "");
			this.$("#manual-reg-alias").attr("placeholder", "Listening...").prop("disabled", true);
			// should be listenToOnce
			this.listenTo(App.participantServer, "data", function (data) {
				this.cancelListen();
				console.log(data.choices[0]);
				this.$(".listen-alias").trigger("to-state1");

				updateModel.apply(this, [data.choices[0]]);
			});
		},


		cancelListen: function () {
			console.log("cancel");
			this.stopListening(App.participantServer, "data");
			this.$("#manual-reg-alias").removeAttr("placeholder").prop("disabled", false);
		},

		register: function (event) {
			event.preventDefault();

			var alias = this.$("#manual-reg-alias").val();
			var name = this.$("#manual-reg-name").val();

			this.model.set({
				"alias": alias,
				"name": name
			});

			this.trigger("save-registration", this.model);
		},

		afterRender: function () {
			this.$(".listen-alias").toggleButton({
				textState1: "Listen",
				textState2: "Cancel",
				clickState1: this.listenForId,
				clickState2: this.cancelListen
			});
		},

		initialize: function () {
			_.bindAll(this, "listenForId", "cancelListen");
			this.listenTo(this.model, {
				change: function () {
					console.log("model changed!");

					this.$("#manual-reg-alias").val(this.model.get("alias"));
					this.$("#manual-reg-name").val(this.model.get("name"));
				}
			});
		}
	});

	Register.Views.Register = App.BaseView.extend({
		tagName: "div",
		template: "framework/templates/register/register",

		serialize: function () {
		},

		beforeRender: function () {
			this.insertViews({
				".participants": new Participant.Views.Table({ collection: this.options.participants }),
				".register-participant": new Register.Views.FormRegistration({ model: new Participant.Model(), collection: this.options.participants })
			});
		},

		initialize: function () {
			this.on("save-registration", this.register);
		},

		register: function (participant) {
			console.log("registering ", participant.get("alias"), participant.get("name"));

			var participants = this.options.participants;
			var saved = participant.save(null, {
				success: function () {
					console.log("successfully saved!");
					participants.fetch();
					participant.clear();
				},
				error: function () {
					console.log("error saving", arguments);
				}
			});

			if (!saved) {
				console.log("didn't save: " +participant.validationError);
			}
		}
	});

	return Register;
});