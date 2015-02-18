module ComponentsHelper
  def error_tag(model, attribute)
    if model.errors.has_key? attribute
      content_tag( :span, model.errors[attribute].first, class: 'error_message' )
    end
  end

  def attribute_has_error?(model, attribute)
    (model.errors.has_key? attribute)
  end

  def form_input_error_class(model, attribute)
    if attribute_has_error?(model, attribute)
      "form-input-text-error"
    end
  end

  def form_text_input_field(form, model, attribute)
    content_tag(:div, :class => "form-group") do
      (form.label attribute, :class => "col-lg-full control-label") << error_tag(model, attribute) <<
      (form.text_field attribute, :class => "form-control #{form_input_error_class(model, attribute)}")
    end
  end

  def form_submit_button(form)
    (form.submit :class => "btn btn-default form-btn")
  end

  def data_table(models, attributes = [])

    content_tag(:table, :class => "table table-striped table-hover") do
      (content_tag(:thead) do
        content_tag :tr do
          header = attributes.collect { |attribute|
            concat content_tag(:th, (t ".#{attribute}"))
          }
          header[0] << (content_tag(:th, 'Ações'))
          header.to_s.html_safe
        end
      end) <<
      (content_tag :tbody do
        models.collect { |model|
          concat (content_tag :tr do
             count = 0
             line = attributes.collect { |attribute|
               count += count+1
               if count == 1
                 concat content_tag :td, ((show_button(model, (t model[attributes.first]))))
               else
                 concat content_tag :td, (model[attribute])
               end
             }
             line[0] << (content_tag :td, (((edit_button(model)) << remove_button(model))))
             line
          end)
        }.to_s.html_safe
      end)
    end
  end

  def link_button(label, path)
    (link_to (t ".#{label}"), path, :class => "btn btn-info")
  end

  def back_button(label = 'links.voltar', path)
    (link_to path do
      (content_tag :i, "",  :class => "back-button-icon")
    end)
  end

  def show_button(path, label = 'links.mostrar')
    (link_to label, path)
  end

  def edit_button(model, label = 'links.editar')
    (link_to send(("edit_#{model.class.name.downcase}_path"), model) do
      (content_tag :i, "",  :class => "edit-button-icon")
    end)
  end

  def remove_button(model, label = 'links.apagar')
    (link_to model, method: :delete, data: { confirm: "Tem certeza que dseja exluir o registro?" } do
      (content_tag :i, "",  :class => "delete-button-icon")
    end)
  end

  def show_header(header_message_nome_param)
    content_tag(:div, :class => "panel-heading") do
      content_tag(:h2, :class => "panel-title show-title") do
        (t ".perfil", nome: header_message_nome_param)
      end
    end
  end

  def show_full_row(model, attribute)
    content_tag(:div, :class => "row") do
      content_tag(:div, :class => "full-cell") do
        show_field(model, attribute)
      end
    end
  end

  def show_body()
    content_tag(:div, :class => "panel-body") do
      yield if block_given?
    end
  end

  def show_two_column_row(model_row_one, attribute_row_one, model_row_two, attribute_row_two)
    content_tag(:div, :class => "row") do
      show_column_row(model_row_one, attribute_row_one) <<
      show_column_row(model_row_two, attribute_row_two)
    end
  end

  def show_column_row(model, attribute)
    content_tag(:div, :class => "cell") do
      show_field(model, attribute)
    end
  end

  def show_field(model, attribute)
    content_tag(:span, :class => "label label-default") do
      (t ".#{attribute}")
    end << " ".freeze <<
    (model[attribute])
  end

end
