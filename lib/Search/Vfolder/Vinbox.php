<?php
/**
 * This class provides a data structure for storing the virtual inbox.
 *
 * Copyright 2010 The Horde Project (http://www.horde.org/)
 *
 * See the enclosed file COPYING for license information (GPL). If you
 * did not receive this file, see http://www.fsf.org/copyleft/gpl.html.
 *
 * @author   Michael Slusarz <slusarz@horde.org>
 * @category Horde
 * @license  http://www.fsf.org/copyleft/gpl.html GPL
 * @package  IMP
 */
class IMP_Search_Vfolder_Vinbox extends IMP_Search_Vfolder
{
    /**
     * Can this query be edited?
     *
     * @var boolean
     */
    protected $_canEdit = false;

    /**
     * List of serialize entries not to save.
     *
     * @var array
     */
    protected $_nosave = array('i', 'l', 'm');

    /**
     * Constructor.
     *
     * The 'add', 'id', 'label', and 'mboxes' parameters are not honored.
     *
     * @see parent::__construct()
     */
    public function __construct(array $opts = array())
    {
        $this->enabled = empty($opts['disable']);

        $this->add(new IMP_Search_Element_Flag(
            '\\seen',
            false
        ));
        $this->add(new IMP_Search_Element_Flag(
            '\\deleted',
            false
        ));

        $this->_init();
    }

    /**
     * Initialization tasks.
     */
    protected function _init()
    {
        $this->_id = 'vinbox';
        $this->_label = _("Virtual Inbox");
    }

    /**
     * Get object properties.
     * Only create mailbox list on demand.
     *
     * @see parent::__get()
     */
    public function __get($name)
    {
        switch ($name) {
        case 'mboxes':
            return $GLOBALS['injector']->getInstance('IMP_Imap_Tree')->getPollList(true, true);
        }

        return parent::__get($name);
    }

    /**
     * Unserialization.
     *
     * @param string $data  Serialized data.
     *
     * @throws Exception
     */
    public function unserialize($data)
    {
        parent::unserialize($data);
        $this->_init();
    }

}
