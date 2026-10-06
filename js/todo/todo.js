// js/todo/todo.js

import {
    loadTodos,
    addTodo,
    deleteTodo
} from "../data/todo-data.js?v=0.98";

import { syncNotificationState } from "../push/notification-state.js?v=0.98";

            input.focus();

        } catch (error) {

            console.error(
                "To-Do konnte nicht hinzugefügt werden:",
                error
            );

        } finally {

            addButton.disabled = false;
        }
    }
}

                    } catch (error) {

                        console.error(
                            "To-Do konnte nicht gelöscht werden:",
                            error
                        );

                        deleteButton.disabled =
                            false;
                    }
                }
            );


            li.appendChild(
                deleteButton
            );

            listElement.appendChild(
                li
            );
        }
    );
}
