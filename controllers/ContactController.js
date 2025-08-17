const { supabaseAdmin } = require('../config/supabase');

class ContactController {
  static async submitContactMessage(req, res) {
    try {
      const { fullName, email, phone, message } = req.body;

      if (!fullName || !email || !message) {
        return res.status(400).json({
          error: 'Missing required fields',
          details: 'fullName, email, and message are required'
        });
      }

      console.log('ContactController: Submitting contact message:', { fullName, email, phone: phone || 'N/A' });

      const { data, error: dbError } = await supabaseAdmin
        .from('contact_messages')
        .insert([
          {
            full_name: fullName,
            email: email,
            phone: phone || null,
            message: message,
            status: 'unread'
          }
        ])
        .select();

      if (dbError) {
        console.error('ContactController: Database error:', dbError);
        return res.status(500).json({
          error: 'Database error',
          details: dbError.message
        });
      }

      console.log('ContactController: Contact message saved successfully:', data);

      res.status(201).json({
        success: true,
        message: 'Contact message sent successfully',
        data: data
      });

    } catch (error) {
      console.error('ContactController: Error submitting contact message:', error);
      res.status(500).json({
        error: 'Failed to send contact message',
        details: error.message
      });
    }
  }

  static async getContactMessages(req, res) {
    try {
      const { data, error } = await supabaseAdmin
        .from('contact_messages')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('ContactController: Error fetching contact messages:', error);
        return res.status(500).json({
          error: 'Failed to fetch contact messages',
          details: error.message
        });
      }

      res.status(200).json({
        success: true,
        data: data
      });

    } catch (error) {
      console.error('ContactController: Error fetching contact messages:', error);
      res.status(500).json({
        error: 'Failed to fetch contact messages',
        details: error.message
      });
    }
  }

  static async updateContactMessageStatus(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!status) {
        return res.status(400).json({
          error: 'Status is required'
        });
      }

      const { data, error } = await supabaseAdmin
        .from('contact_messages')
        .update({ status })
        .eq('id', id)
        .select();

      if (error) {
        console.error('ContactController: Error updating contact message status:', error);
        return res.status(500).json({
          error: 'Failed to update contact message status',
          details: error.message
        });
      }

      if (!data || data.length === 0) {
        return res.status(404).json({
          error: 'Contact message not found'
        });
      }

      res.status(200).json({
        success: true,
        message: 'Contact message status updated successfully',
        data: data[0]
      });

    } catch (error) {
      console.error('ContactController: Error updating contact message status:', error);
      res.status(500).json({
        error: 'Failed to update contact message status',
        details: error.message
      });
    }
  }
}

module.exports = ContactController;