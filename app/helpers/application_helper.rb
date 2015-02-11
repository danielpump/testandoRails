module ApplicationHelper
  def error_tag(model, attribute)
    if model.errors.has_key? attribute
      content_tag( :div, model.errors[attribute].first, class: 'error_message' )
    end
  end

  def form_text_input_field(form, model, attribute)
    content_tag(:div, :class => "form-group") do
      (form.label attribute, :class => "col-lg-full control-label") <<        
      (form.text_field attribute, :class => "form-control") <<  
      (error_tag(model, attribute))
    end
  end
  
  def form_submit_button(form)
    content_tag(:div, :class => "form-group") do
      (form.submit :class => "btn btn-default")
    end
  end
    

end
