/**
 * Provides the javascript for the fetchmailprefs.php script.
 *
 * See the enclosed file COPYING for license information (GPL). If you
 * did not receive this file, see http://www.fsf.org/copyleft/gpl.html.
 */

var ImpFetchmailprefs = {

    // The following variables are defined in fetchmailprefs.php:
    //   fetchurl, prefsurl
    fmprefs_loading: false,

    _accountSubmit: function(isnew)
    {
        if (!this.fmprefs_loading &&
            ((isnew != null) || !$F('account').empty())) {
            this.fmprefs_loading = true;
            $('fm_switch').submit();
        }
    },

    _driverSubmit: function()
    {
        if (!this.fmprefs_loading && $F('fm_driver')) {
            this.fmprefs_loading = true;
            $('fm_driver_form').submit();
        }
    },

    onDomLoad: function()
    {
        document.observe('change', this._changeHandler.bindAsEventListener(this));
        document.observe('click', this._clickHandler.bindAsEventListener(this));
    },

    _changeHandler: function(e)
    {
        switch (e.element().readAttribute('id')) {
        case 'account':
            this._accountSubmit();
            break;

        case 'fm_driver':
            this._driverSubmit();
            break;
        }
    },

    _clickHandler: function(e)
    {
        switch (e.element().readAttribute('id')) {
        case 'btn_delete':
            $('actionID').setValue('fetchmail_prefs_delete');
            break;

        case 'btn_create':
            $('actionID').setValue('fetchmail_create');
            this._accountSubmit(true);
            break;

        case 'btn_return':
            document.location.href = this.prefsurl;
            break;

        case 'btn_save':
            $('actionID').setValue('fetchmail_prefs_save');
            break;

        case 'btn_select':
            document.location.href = this.fetchurl;
            break;
        }
    }

};

document.observe('dom:loaded', ImpFetchmailprefs.onDomLoad.bind(ImpFetchmailprefs));
