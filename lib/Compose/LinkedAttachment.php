<?php
/**
 * Copyright 2013 Horde LLC (http://www.horde.org/)
 *
 * See the enclosed file COPYING for license information (LGPL). If you
 * did not receive this file, see http://www.horde.org/licenses/lgpl21.
 *
 * @category  Horde
 * @copyright 2013 Horde LLC
 * @license   http://www.horde.org/licenses/lgpl21 LGPL 2.1
 * @package   IMP
 */

/**
 * Linked attachment data.
 *
 * @author    Michael Slusarz <slusarz@horde.org>
 * @category  Horde
 * @copyright 2013 Horde LLC
 * @license   http://www.horde.org/licenses/lgpl21 LGPL 2.1
 * @package   IMP
 */
class IMP_Compose_LinkedAttachment
{
    /* The name of the metadata file. */
    const METADATA_NAME = 'metadata';

    /* The virtual path to save linked attachments. */
    const VFS_LINK_ATTACH_PATH = '.horde/imp/attachments';

    /**
     * Attachment ID (filename in VFS).
     *
     * @var string
     */
    protected $_id;

    /**
     * Cached metadata information.
     *
     * @var array
     */
    protected $_md;

    /**
     * Owner of the attachment.
     *
     * @var string
     */
    protected $_user;

    /**
     * VFS object.
     *
     * @var Horde_Vfs_Base
     */
    protected $_vfs;

    /**
     * Constructor.
     *
     * @param string $user  Attachment owner.
     * @param string $id    ID of the attachment.
     *
     * @throws Horde_Vfs_Exception
     * @throws IMP_Exception
     */
    public function __construct($user, $id = null)
    {
        /* Sanity checking. */
        if (empty($GLOBALS['conf']['compose']['link_attachments'])) {
            throw new IMP_Exception('Linked attachments are forbidden.');
        }

        $this->_id = $id;
        $this->_user = $user;
        $this->_vfs = $GLOBALS['injector']->getInstance('Horde_Core_Factory_Vfs')->create();
    }

    /**
     * Generate the URL for the linked attachment.
     *
     * @return Horde_Url  World accessible URL to the attachment.
     */
    public function getUrl()
    {
        return Horde::url('attachment.php', true)->setRaw(true)->add(array(
            'id' => $this->_id,
            'u' => $this->_user
        ));
    }

    /**
     * Save attachment data as a linked attachment.
     *
     * @param IMP_Compose_Attachment $atc  Attachment object.
     *
     * @throw Horde_Vfs_Exception
     */
    public function save(IMP_Compose_Attachment $atc)
    {
        global $browser;

        /* We know that VFS is setup if we are linking attachments, so
         * data can be moved within the VFS namespace. */
        try {
            $this->_vfs->rename($atc::VFS_ATTACH_PATH, $atc->vfsname, $this->_getPath(), $this->_id);

            $this->_loadMetadata();
            $part = $atc->getPart();

            // Prevent 'jar:' attacks on Firefox.  See Ticket #5892.
            $type = $part->getType();
            if ($browser->isBrowser('mozilla') &&
                in_array(Horde_String::lower($type), array('application/java-archive', 'application/x-jar'))) {
                $type = 'application/octet-stream';
            }

            $this->_md[$this->_id] = array(
                'f' => $part->getName(true),
                'm' => $type,
                't' => time()
            );

            $this->_saveMetadata();
        } catch (Horde_Vfs_Exception $e) {
            Horde::log($e, 'ERR');
            throw $e;
        }
    }

    /**
     * Send data to the browser.
     *
     * @throw IMP_Exception
     */
    public function sendData()
    {
        global $browser;

        $path = $this->_getPath();

        if (!$this->_vfs->exists($path, $this->_id)) {
            throw new IMP_Exception(_("The linked attachment does not exist. It may have been deleted by the original sender or it may have expired."));
        }

        $this->_loadMetadata();

        $fname = isset($this->_md[$this->_id]['f'])
            ? $this->_md[$this->_id]['f']
            : null;
        $type = isset($this->_md[$this->_id]['m'])
            ? $this->_md[$this->_id]['m']
            : null;


        if (method_exists($this->_vfs, 'readStream')) {
            $data = $this->_vfs->readStream($path, $this->_id);
        } else {
            $data = fopen('php://temp', 'w+');
            fwrite($data, $this->_vfs->read($path, $this->_id));
        }

        fseek($data, 0, SEEK_END);
        $size = ftell($data);
        rewind($data);

        $browser->downloadHeaders($fname, $type, false, $size);

        while (!feof($data)) {
            echo fread($data, 8192);
        }
        fclose($data);
    }

    /**
     * Delete a linked attachment.
     *
     * @param string $token  The delte token.
     *
     * @return boolean|string  Filename of deleted file, or false if file was
     *                         not deleted.
     */
    public function delete($token)
    {
        if (empty($GLOBALS['conf']['compose']['link_attachments_notify'])) {
            return false;
        }

        $this->_loadMetadata();
        if (!isset($this->_md[$this->_id]['d']) ||
            ($this->_md[$this->_id]['d'] != $token)) {
            return false;
        }

        try {
            $this->_vfs->deleteFile($this->_getPath(), $this->_id);
        } catch (Exception $e) {}

        $fname = $this->_md[$this->_id]['f'];
        unset($this->_md[$this->_id]);
        $this->_saveMetadata();

        return $fname;
    }

    /**
     * Send notification to attachment owner.
     */
    public function sendNotification()
    {
        global $conf, $injector;

        if (empty($conf['compose']['link_attachments_notify'])) {
            return;
        }

        try {
            $identity = $injector->getInstance('Horde_Core_Factory_Identity')->create($this->_user);
            $address = $identity->getDefaultFromAddress();

            /* Ignore missing addresses, which are returned as <>. */
            if (strlen($address) < 3) {
                return;
            }

            $this->_loadMetadata();
            if (!isset($this->_md[$this->_id]) ||
                isset($this->_md[$this->_id]['d'])) {
                return;
            }
            $md = $this->_md[$this->_id];

            $address_full = $identity->getDefaultFromAddress(true);

            $h = new Horde_Mime_Headers();
            $h->addReceivedHeader(array(
                'dns' => $injector->getInstance('Net_DNS2_Resolver'),
                'server' => $conf['server']['name']
            ));
            $h->addMessageIdHeader();
            $h->addUserAgentHeader();
            $h->addHeader('Date', date('r'));
            $h->addHeader('From', $address_full);
            $h->addHeader('To', $address_full);
            $h->addHeader('Subject', _("Notification: Linked attachment downloaded"));
            $h->addHeader('Auto-Submitted', 'auto-generated');

            $msg = new Horde_Mime_Part();
            $msg->setType('text/plain');
            $msg->setCharset('UTF-8');

            /* Create a delete token for this file. */
            $delete_id = strval(new Horde_Support_Uuid());

            $msg->setContents(Horde_String::wrap(
                _("Your linked attachment has been downloaded by at least one user.") . "\n\n" .
                sprintf(_("Name: %s"), $md['f']) . "\n" .
                sprintf(_("Type: %s"), $md['m']) . "\n" .
                sprintf(_("Sent Date: %s"), date('r', $md['t'])) . "\n\n" .
                _("Click on the following link to permanently delete the attachment:") . "\n" .
                strval($this->getUrl()->add('d', $delete_id))
            ));

            $msg->send($address, $h, $injector->getInstance('Horde_Mail'));

            $this->_md[$this->_id]['d'] = $delete_id;
            $this->_saveMetadata();
        } catch (Exception $e) {
            Horde::log($e, 'ERR');
        }
    }

    /**
     * Clean up old linked attachment data.
     *
     * @return boolean  True if at least one attachment was deleted.
     */
    public function clean()
    {
        $ret = false;

        if (!($keep = self::keepDate(true))) {
            return $ret;
        }

        $this->_loadMetadata();
        $path = $this->_getPath();

        foreach ($this->_md as $key => $val) {
            if (empty($val['t']) || ($val['t'] < $keep)) {
                try {
                    $this->_vfs->deleteFile($path, $key);
                } catch (Exception $e) {}
                unset($this->_md[$key]);
                $ret = true;
            }
        }

        if ($ret) {
            $this->_saveMetadata();
        }

        return $ret;
    }

    /* Static methods. */

    /**
     * Create a linked attachment object from attachment data.
     *
     * @param IMP_Compose_Attachment $atc  Attachment object.
     *
     * @return IMP_Compose_LinkedAttachment  Linked attachment object.
     * @throw IMP_Exception
     */
    static public function create(IMP_Compose_Attachment $atc)
    {
        $ob = new self(
            $GLOBALS['registry']->getAuth(),
            strval(new Horde_Support_Uuid())
        );

        $ob->save($atc);

        return $ob;
    }

    /**
     * Return UNIX timestamp of linked attachment expiration time.
     *
     * @param boolean $past  If true, determine maximim creation time for
     *                       expiration. If false, determine future expiration
     *                       time.
     *
     * @return integer|null  UNIX timestamp, or null if attachments are not
     *                       pruned.
     */
    static public function keepDate($past = true)
    {
        return ($damk = $GLOBALS['prefs']->getValue('delete_attachments_monthly_keep'))
            ? mktime(0, 0, 0, date('n') + ($past ? ($damk * -1) : ($damk + 1)), 1, date('Y'))
            : null;
    }

    /* Private methods. */

    /**
     * Generate the user's VFS path.
     *
     * @return string  The user's VFS path.
     */
    protected function _getPath()
    {
        return self::VFS_LINK_ATTACH_PATH . '/' . $this->_user;
    }

    /**
     * Load the user's attachment metadata into memory.
     */
    protected function _loadMetadata()
    {
        if (!isset($this->_md)) {
            try {
                $this->_md = json_decode($this->_vfs->read($this->_getPath(), self::METADATA_NAME), true);
            } catch (Horde_Vfs_Exception $e) {}

            if (!is_array($this->_md)) {
                $this->_md = array();
            }
        }

        return $this->_md;
    }

    /**
     * Save the user's attachment metadata.
     *
     * @throws IMP_Exception
     */
    protected function _saveMetadata()
    {
        if (empty($this->_md)) {
            $this->_vfs->deleteFile($this->_getPath(), self::METADATA_NAME);
        } else {
            $this->_vfs->writeData($this->_getPath(), self::METADATA_NAME, json_encode($this->_md), true);
        }
    }

}
