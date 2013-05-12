<?php
/**
 * Copyright 2011-2013 Horde LLC (http://www.horde.org/)
 *
 * See the enclosed file COPYING for license information (GPL). If you
 * did not receive this file, see http://www.horde.org/licenses/gpl.
 *
 * @category  Horde
 * @copyright 2011-2013 Horde LLC
 * @license   http://www.horde.org/licenses/gpl GPL
 * @package   IMP
 */

/**
 * Defines an AJAX variable queue for IMP.  These are variables that may be
 * generated by various IMP code that should be added to the eventual output
 * sent to the browser.
 *
 * @author    Michael Slusarz <slusarz@horde.org>
 * @category  Horde
 * @copyright 2011-2013 Horde LLC
 * @license   http://www.horde.org/licenses/gpl GPL
 * @package   IMP
 */
class IMP_Ajax_Queue
{
    /**
     * The list of attachments.
     *
     * @var array
     */
    protected $_atc = array();

    /**
     * The compose object.
     *
     * @var IMP_Compose
     */
    protected $_compose;

    /**
     * Flag entries to add to response.
     *
     * @var array
     */
    protected $_flag = array();

    /**
     * Add flag configuration to response.
     *
     * @var boolean
     */
    protected $_flagconfig = false;

    /**
     * Mailbox options.
     *
     * @var array
     */
    protected $_mailboxOpts = array();

    /**
     * Message queue.
     *
     * @var array
     */
    protected $_messages = array();

    /**
     * Mail log queue.
     *
     * @var array
     */
    protected $_maillog = array();

    /**
     * Poll mailboxes.
     *
     * @var array
     */
    protected $_poll = array();

    /**
     * Add quota information to response?
     *
     * @var string
     */
    protected $_quota = false;

    /**
     * Generates AJAX response task data from the queue.
     *
     * For compose attachment data (key: 'compose-atc'), an array of objects
     * with these properties:
     *   - icon: (string) Data url string containing icon information.
     *   - name: (string) The attachment name
     *   - num: (integer) The current attachment number
     *   - size: (string) The size of the attachment
     *   - type: (string) The MIME type of the attachment
     *   - view: (boolean) Link to attachment preivew page
     *
     * For compose cacheid data (key: 'compose'), an object with these
     * properties:
     *   - atclimit: (integer) If set, no further attachments are allowed.
     *   - cacheid: (string) Current cache ID of the compose message.
     *
     * For flag data (key: 'flag'), an array of objects with these properties:
     *   - add: (array) The list of flags that were added.
     *   - remove: (array) The list of flags that were removed.
     *   - uids: (string) Indices of the messages that have changed (IMAP
     *           sequence string; mboxes are base64url encoded).
     *
     * For flag configuration data (key: 'flag-config'), an array containgin
     * flag data:
     *   - a: (boolean) Indicates a flag that can be *a*ltered.
     *   - b: (string) Background color.
     *   - c: (string) CSS class.
     *   - f: (string) Foreground color.
     *   - i: (string) CSS icon.
     *   - id: (string) Flag ID (IMAP flag id).
     *   - l: (string) Flag label.
     *   - s: (boolean) Indicates a flag that can be *s*earched for.
     *   - u: (boolean) Indicates a *u*ser flag.
     *
     * For mailbox data (key: 'mailbox'), an array with these keys:
     *   - a: (array) Mailboxes that were added (base64url encoded).
     *   - all: (integer) TODO
     *   - base: (string) TODO
     *   - c: (array) Mailboxes that were changed (base64url encoded).
     *   - d: (array) Mailboxes that were deleted (base64url encoded).
     *   - expand: (integer) Expand subfolders on load.
     *   - noexpand: (integer) TODO
     *   - switch: (string) Load this mailbox (base64url encoded).
     *
     * For maillog data (key: 'maillog'), an object with these properties:
     *   - buid: (integer) BUID.
     *   - log: (array) List of log entries.
     *   - mbox: (string) Mailbox.
     *
     * For message preview data (key: 'message'), an object with these
     * properties:
     *   - buid: (integer) BUID.
     *   - data: (object) Message viewport data.
     *   - mbox: (string) Mailbox.
     *
     * For poll data (key: 'poll'), an array with keys as base64url encoded
     * mailbox names, values as the number of unseen messages.
     *
     * For quota data (key: 'quota'), an array with these keys:
     *   - m: (string) Quota message.
     *   - p: (integer) Quota percentage.
     *
     * @param IMP_Ajax_Application $ajax  The AJAX object.
     */
    public function add(IMP_Ajax_Application $ajax)
    {
        global $injector;

        /* Add compose attachment information. */
        if (!empty($this->_atc)) {
            $ajax->addTask('compose-atc', $this->_atc);
            $this->_atc = array();
        }

        /* Add compose information. */
        if (!is_null($this->_compose)) {
            $compose = new stdClass;
            if (!$this->_compose->additionalAttachmentsAllowed()) {
                $compose->atclimit = 1;
            }
            $compose->cacheid = $this->_compose->getCacheId();

            $ajax->addTask('compose', $compose);
            $this->_compose = null;
        }

        /* Add flag information. */
        if (!empty($this->_flag)) {
            $ajax->addTask('flag', $this->_flag);
            $this->_flag = array();
        }

        /* Add flag configuration. */
        if ($this->_flagconfig) {
            $flags = array();

            foreach ($injector->getInstance('IMP_Flags')->getList() as $val) {
                $flags[] = array_filter(array(
                    'a' => $val->canset,
                    'b' => $val->bgdefault ? null : $val->bgcolor,
                    'c' => $val->css,
                    'f' => $val->fgcolor,
                    'i' => $val->css ? null : $val->cssicon,
                    'id' => $val->id,
                    'l' => $val->label,
                    's' => intval($val instanceof IMP_Flag_Imap),
                    'u' => intval($val instanceof IMP_Flag_User)
                ));
            }

            $ajax->addTask('flag-config', $flags);
        }

        /* Add folder tree information. */
        $imptree = $injector->getInstance('IMP_Imap_Tree');
        $imptree->setIteratorFilter(IMP_Imap_Tree::FLIST_NOSPECIALMBOXES);
        $out = $imptree->getAjaxResponse();
        if (!empty($out)) {
            $ajax->addTask('mailbox', array_merge($out, $this->_mailboxOpts));
        }

        /* Add mail log information. */
        if (!empty($this->_maillog)) {
            $imp_maillog = $injector->getInstance('IMP_Maillog');
            $maillog = array();

            foreach ($this->_maillog as $val) {
                if ($tmp = $imp_maillog->getLogObs($val['msg_id'])) {
                    $log_ob = new stdClass;
                    $log_ob->buid = intval($val['buid']);
                    $log_ob->log = $tmp;
                    $log_ob->mbox = $val['mailbox']->form_to;
                    $maillog[] = $log_ob;
                }
            }

            if (!empty($maillog)) {
                $ajax->addTask('maillog', $maillog);
            }
        }

        /* Add message information. */
        if (!empty($this->_messages)) {
            $ajax->addTask('message', $this->_messages);
            $this->_messages = array();
        }

        /* Add poll information. */
        $poll = $poll_list = array();
        foreach ($this->_poll as $val) {
            $poll_list[strval($val)] = 1;
        }

        if (count($poll_list)) {
            $imap_ob = $injector->getInstance('IMP_Imap');
            if ($imap_ob->init) {
                foreach ($imap_ob->statusMultiple(array_keys($poll_list), Horde_Imap_Client::STATUS_UNSEEN) as $key => $val) {
                    $poll[IMP_Mailbox::formTo($key)] = intval($val['unseen']);
                }
            }

            if (!empty($poll)) {
                $ajax->addTask('poll', $poll);
                $this->_poll = array();
            }
        }

        /* Add quota information. */
        if (($this->_quota !== false) &&
            ($quotadata = $injector->getInstance('IMP_Quota_Ui')->quota($this->_quota))) {
            $ajax->addTask('quota', array(
                'm' => $quotadata['message'],
                'p' => round($quotadata['percent']),
                'l' => $quotadata['percent'] >= 90
                    ? 'alert'
                    : ($quotadata['percent'] >= 75 ? 'warn' : '')
            ));
            $this->_quota = false;
        }
    }

    /**
     * Return information about the current attachment(s) for a message.
     *
     * @param mixed $ob      If an IMP_Compose object, return info on all
     *                       attachments. If an IMP_Compose_Attachment object,
     *                       only return information on that object.
     * @param integer $type  The compose type.
     */
    public function attachment($ob, $type = IMP_Compose::COMPOSE)
    {
        global $injector;

        $parts = ($ob instanceof IMP_Compose)
            ? iterator_to_array($ob)
            : array($ob);

        foreach ($parts as $val) {
            $mime = $val->getPart();
            $mtype = $mime->getType();

            $this->_atc[] = array(
                'icon' => strval(Horde_Url_Data::create('image/png', file_get_contents($injector->getInstance('Horde_Core_Factory_MimeViewer')->getIcon($mtype)->fs))),
                'name' => $mime->getName(true),
                'num' => $val->id,
                'type' => $mtype,
                'size' => IMP::sizeFormat($mime->getBytes()),
                'url' => strval($val->viewUrl()->setRaw(true)),
                'view' => intval(!in_array($type, array(IMP_Compose::FORWARD_ATTACH, IMP_Compose::FORWARD_BOTH)) && ($mtype != 'application/octet-stream'))
            );
        }
    }

    /**
     * Add compose data to the output.
     *
     * @param IMP_Compose $ob  The compose object.
     */
    public function compose(IMP_Compose $ob)
    {
        $this->_compose = $ob;
    }

    /**
     * Add flag entry to response queue.
     *
     * @param array $flags          List of flags that have changed.
     * @param boolean $add          Were the flags added?
     * @param IMP_Indices $indices  Indices object.
     */
    public function flag($flags, $add, IMP_Indices $indices)
    {
        global $injector;

        if (($indices instanceof IMP_Indices_Mailbox) &&
            (!$indices->mailbox->access_flags ||
             !count($indices = $indices->joinIndices()))) {
            return;
        }

        $changed = $injector->getInstance('IMP_Flags')->changed($flags, $add);

        $result = new stdClass;
        if (!empty($changed['add'])) {
            $result->add = array_map('strval', $changed['add']);
        }
        if (!empty($changed['remove'])) {
            $result->remove = array_map('strval', $changed['remove']);
        }

        $result->buids = $indices->toArray();
        $this->_flag[] = $result;
    }

    /**
     * Add flag configuration information to response queue.
     */
    public function flagConfig()
    {
        $this->_flagconfig = true;
    }

    /**
     * Add message data to output.
     *
     * @param IMP_Indices $indices  Index of the message.
     * @param boolean $preview      Preview data?
     * @param boolean $peek         Don't set seen flag?
     */
    public function message(IMP_Indices $indices, $preview = false,
                            $peek = false)
    {
        try {
            $show_msg = new IMP_Ajax_Application_ShowMessage($indices, $peek);
            $msg = (object)$show_msg->showMessage(array(
                'preview' => $preview
            ));
            $msg->save_as = strval($msg->save_as);

            if ($indices instanceof IMP_Indices_Mailbox) {
                $indices = $indices->joinIndices();
            }

            foreach ($indices as $val) {
                foreach ($val->uids as $val2) {
                    $ob = new stdClass;
                    $ob->buid = $val2;
                    $ob->data = $msg;
                    $ob->mbox = $val->mbox->form_to;
                    $this->_messages[] = $ob;
                }
            }
        } catch (Exception $e) {}
    }

    /**
     * Add mail log data to output.
     *
     * @param IMP_Indices $indices  Indices object.
     * @param string $msg_id        The message ID of the original message.
     */
    public function maillog(IMP_Indices $indices, $msg_id)
    {
        if (!$GLOBALS['injector']->getInstance('IMP_Maillog')) {
            return;
        }

        if ($indices instanceof IMP_Indices_Mailbox) {
            $indices = $indices->joinIndices();
        }

        foreach ($indices as $val) {
            foreach ($val->uids as $val2) {
                $this->_maillog[] = array(
                    'buid' => $val2,
                    'mailbox' => $val->mbox,
                    'msg_id' => $msg_id
                );
            }
        }
    }

    /**
     * Add additional options to the mailbox output.
     *
     * @param array $name   Option name.
     * @param mixed $value  Option value.
     */
    public function setMailboxOpt($name, $value)
    {
        $this->_mailboxOpts[$name] = $value;
    }

    /**
     * Add poll entry to response queue.
     *
     * @param mixed $mboxes  A mailbox name or list of mailbox names.
     */
    public function poll($mboxes)
    {
        if (!is_array($mboxes)) {
            $mboxes = array($mboxes);
        }

        foreach (IMP_Mailbox::get($mboxes) as $val) {
            if ($val->polled) {
                $this->_poll[] = $val;
            }
        }
    }

    /**
     * Add quota entry to response queue.
     *
     * @param string $mailbox  Mailbox to query for quota.
     */
    public function quota($mailbox)
    {
        $this->_quota = $mailbox;
    }

}
